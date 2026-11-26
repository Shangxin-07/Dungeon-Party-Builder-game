/**
 * Rooms and fights: what a room handler can do, which monsters turn up, the
 * fight itself, and the risen who walk the floors.
 */
import { foeSheet, runCombat, type Side } from "../combat";
import { floorPower, levelPower, rollEncounter } from "../encounter";
import { risenHero, risenName, type Risen } from "../fallen";
import { partyAlignment } from "../alignment";
import { heroSheet, type Hero } from "../hero";
import { reactToParty } from "../reactions";
import { partyStealth, sneakChance } from "../stealth";
import { type RoomContext } from "../rooms";
import type { CarriedGear } from "./report";
import { an, list } from "./trip";
import { TripCare } from "./care";
import { shardPlace } from "../shards";
import { dueMoment, type MomentTrigger } from "../moments";
import { bondsFor } from "../ties";
import type { MomentDef } from "../../content/types";
import type { TripMoment } from "./report";

/** Moment damage grows with depth, like traps. */
const MOMENT_HURT_PER_FLOOR = 1.3;

/** Rooms and fights. Extended by TripRescue. */
export class TripFights extends TripCare {
  protected context(roomId: string): RoomContext {
    return {
      ix: this.ix,
      rng: this.rng,
      depth: this.depth,
      room: this.ix.room(roomId),
      conscious: this.conscious,
      alive: this.alive,
      best: (s) => this.best(s),
      maxHp: this.maxHp,
      maxMana: this.maxMana,
      log: (kind, text) => this.emit(kind, text),
      rollMonsters: () => this.rollMonsters(),
      fight: (m, o) => this.fight(m, o),
      hurt: (h, a, t) => this.hurt(h, a, t),
      heal: (h, a) => this.heal(h, a),
      restoreMana: (h, a) => this.restoreMana(h, a),
      findLoot: (t, from) => this.findLoot(t, from, true),
      alignment: () => this.alignmentNow(),
      leader: () => this.leader(),
      deed: (fact) => this.deeds[fact]++,
      gift: (gold, news) => this.gifts.push({ gold, news }),
    };
  }

  // -------------------------------------------------------------------------
  // Alignment (DESIGN.md §7)
  // -------------------------------------------------------------------------

  /** The party's alignment id as it stands (the living), or "divided". */
  protected alignmentNow(): string {
    return partyAlignment(this.ix, this.alive()).alignment?.id ?? "divided";
  }

  /**
   * Who speaks for the party: its leader (M7.05) while they're on their feet,
   * else the most charming conscious hero of its alignment.
   */
  protected leader(): Hero | undefined {
    const chosen = this.extras.leader?.id;
    const lead = chosen ? this.conscious().find((h) => h.id === chosen) : undefined;
    if (lead) return lead;
    const align = this.alignmentNow();
    const up = this.conscious();
    const ours = up.filter((h) => h.alignment === align);
    let best: Hero | undefined;
    for (const h of ours.length ? ours : up)
      if (!best || heroSheet(this.ix, h).stats.CHA > heroSheet(this.ix, best).stats.CHA) best = h;
    return best;
  }

  /**
   * Monsters that react to the party's alignment (content/monsters/
   * `reactions`): a goblin band that parleys or takes a toll. True: no fight.
   */
  protected reacts(monsters: readonly string[]): boolean {
    if (!monsters.some((id) => this.ix.monster(id).reactions?.length)) return false;
    const off = reactToParty({
      ix: this.ix,
      rng: this.rng,
      monsters,
      alignment: this.alignmentNow(),
      leader: this.leader(),
      log: (kind, text) => this.emit(kind, text),
      payTribute: () => this.payTribute(),
    });
    if (off) {
      this.parleys++;
      for (const id of monsters) this.seen.add(id);
    }
    return off;
  }

  /** Hand over the cheapest-looking loot (never anyone's own gear). */
  protected payTribute(): string | undefined {
    let pick = -1;
    this.haul.forEach((h, i) => {
      if (h.keep) return;
      if (pick < 0 || h.estimate < this.haul[pick]!.estimate) pick = i;
    });
    if (pick < 0) return undefined;
    const [paid] = this.haul.splice(pick, 1);
    return an(this.ix.item(paid!.item).name.toLowerCase());
  }

  // -------------------------------------------------------------------------
  // Backstory moments (M8.31, content/moments/)
  // -------------------------------------------------------------------------

  /** Check everyone standing for a moment due now. At most one each. */
  protected moments(on: MomentTrigger): void {
    if (!this.ix.lib.moments.length) return;
    for (const h of this.conscious()) {
      const had = this.momentsHad.filter((x) => x.hero === h.id).map((x) => x.moment);
      const m = dueMoment(this.ix, h, this.depth, on, had, this.momentRng);
      if (m) this.playMoment(h, m);
    }
  }

  protected playMoment(h: Hero, m: MomentDef): void {
    this.emit("moment", m.text.replaceAll("{hero}", h.name));
    const had: TripMoment = { hero: h.id, moment: m.id };
    for (const e of m.effects) {
      if (e.type === "morale") had.morale = { amount: e.amount, reason: e.reason };
      else if (e.type === "heal") {
        for (const x of e.all ? this.alive() : [h]) {
          const hp = this.heal(x, Math.round((this.maxHp(x) * e.percent) / 100));
          if (hp) this.emit("moment", `${x.name}: +${hp} HP.`);
        }
      } else if (e.type === "hurt") {
        const scale = MOMENT_HURT_PER_FLOOR ** (this.depth - 1);
        const raw = this.momentRng.int(e.damage[0], e.damage[1]);
        this.hurt(h, Math.round(raw * scale), e.damageType);
      } else if (e.type === "loot") this.findLoot(e.table, e.from, true);
      else if (e.type === "gift") {
        const gold = this.momentRng.int(e.gold[0], e.gold[1]);
        const news = e.news.replaceAll("{gold}", String(gold)).replaceAll("{hero}", h.name);
        this.gifts.push({ gold, news });
      } else if (e.type === "epithet")
        this.emit("moment", `From now on, they call ${h.name} ${e.name}.`);
    }
    this.momentsHad.push(had);
  }

  // -------------------------------------------------------------------------
  // Fights
  // -------------------------------------------------------------------------

  /** A group of monsters from the current floor, as it is today. Empty if it's been cleared out. */
  protected rollMonsters(): string[] {
    this.bearerOut = undefined;
    const f = this.floors?.[this.depth - 1];
    const scale = this.fightScale();
    if (!f) return rollEncounter(this.ix, this.depth, this.rng, scale > 1 ? { scale } : {});
    if (f.population <= 0) return [];
    const monsters = rollEncounter(this.ix, this.depth, this.rng, {
      level: f.level,
      max: f.population,
      ...(scale > 1 ? { scale } : {}),
    });
    return this.bearerJoins(monsters, f.population);
  }

  /**
   * A shard-bearer (DESIGN.md §20) keeps to the back tunnels: only a party
   * hunting its floor (a clear-the-floor order) runs into it, and only once
   * the floor is thinned out. Then it may come out at the head of a group,
   * with an escort cut down to its `escort` share of a usual group.
   */
  protected bearerJoins(monsters: string[], population: number): string[] {
    if (!monsters.length || !this.inHunt) return monsters;
    for (const id of this.extras.shards ?? []) {
      if (this.shardsFound.includes(id)) continue;
      const { source } = shardPlace(this.ix, id);
      if (source.kind !== "bearer" || source.floor !== this.depth) continue;
      if (population > this.ix.floor(this.depth).capacity * source.below) continue;
      if (!this.shardRng.chance(source.chance)) continue;
      const budget = this.usualPower() * source.escort;
      const escort: string[] = [];
      let power = 0;
      for (const m of monsters) {
        const p = this.ix.monster(m).power;
        if (power + p > budget) continue;
        escort.push(m);
        power += p;
      }
      this.bearerOut = id;
      return [source.monster, ...escort];
    }
    return monsters;
  }

  /** A shard of the Hearthstone goes in the packs: nobody leaves it behind. */
  protected takeShard(id: string): void {
    const def = this.ix.item(shardPlace(this.ix, id).set.item);
    this.shardsFound.push(id);
    this.haul.push({ item: def.id, value: def.value, estimate: def.value, keep: true });
    this.repack();
  }

  /** Bigger parties meet bigger groups (M7.05): ×(1 + perFighter per fighter over `over`). */
  protected fightScale(): number {
    const s = this.ix.lib.leadership.scaling;
    return 1 + s.perFighter * Math.max(0, this.fighters - s.over);
  }

  /** Monster power of a usual fight here, for this party's size. */
  protected usualPower(): number {
    const f = this.floors?.[this.depth - 1];
    return (f ? levelPower(f.level) : floorPower(this.depth)) * this.fightScale();
  }

  /** A group that looks bad (M7.05): well above a usual fight, or led by a boss. */
  protected looksBad(monsters: readonly string[], ratio: number): boolean {
    const power = monsters.reduce((s, id) => s + this.ix.monster(id).power, 0);
    const boss = (id: string) => {
      const m = this.ix.monster(id);
      return !!m.variant || m.tags.includes("shard-bearer");
    };
    return power >= ratio * this.usualPower() || monsters.some(boss);
  }

  /**
   * Before a fight that looks bad, an unruly hero may slip away and head home
   * alone (M7.05, DESIGN.md §17.5). At most one a fight; never the leader,
   * never the last one standing.
   */
  protected desertions(monsters: readonly string[]): void {
    const lead = this.extras.leader;
    if (!lead || !Object.keys(lead.desert).length) return;
    if (!this.looksBad(monsters, this.ix.lib.leadership.desert.badFight)) return;
    for (const h of this.conscious()) {
      const chance = lead.desert[h.id] ?? 0;
      if (h.id === lead.id || chance <= 0 || this.conscious().length <= 1) continue;
      if (!this.rng.chance(chance)) continue;
      this.desert(h, monsters);
      return;
    }
  }

  /** A hero runs for it: a porter's odds of getting home alone, from this floor. */
  protected desert(h: Hero, monsters: readonly string[]): void {
    const names = [...new Set(monsters.map((id) => this.ix.monster(id).name.toLowerCase()))];
    const from = list(names);
    this.emit(
      "desert",
      `${h.name} takes one look at the ${from} and slips away into the dark, alone.`,
    );
    const esc = this.ix.lib.town.porters.escape;
    const sheet = heroSheet(this.ix, h);
    const chance = Math.max(
      0.05,
      Math.min(
        0.95,
        esc.base +
          (sheet.stats.DEX + sheet.stats.END - 20) * esc.perStat -
          (this.depth - 1) * esc.perFloor,
      ),
    );
    const home = this.rng.chance(chance);
    const time = this.ix.lib.time;
    this.deserters.push({
      id: h.id,
      name: h.name,
      hero: structuredClone(h),
      home,
      left: this.hours,
      back: Math.round((this.hours + time.climbPerFloor * this.depth) * 100) / 100,
      floor: this.depth,
      room: this.roomNo,
      saw: this.log.length,
      from,
    });
    this.party = this.party.filter((x) => x.id !== h.id);
  }

  protected fight(
    monsters: readonly string[],
    opts: { surprise?: boolean; cornered?: boolean } = {},
  ): Side | "none" {
    if (monsters.length) this.count(monsters);
    // The shard-bearer just rolled (DESIGN.md §20), if it's in this fight.
    const out = this.bearerOut ? shardPlace(this.ix, this.bearerOut) : undefined;
    this.bearerOut = undefined;
    const bearer =
      out?.source.kind === "bearer" && monsters.includes(out.source.monster) ? out : undefined;
    if (bearer?.source.kind === "bearer") {
      const name = this.ix.monster(bearer.source.monster).name;
      this.emit("shard", bearer.source.shows.replace("{monster}", name));
      // Sized up: a party not seasoned enough backs off down the tunnel.
      const levels = this.conscious().reduce((n, h) => n + h.level, 0);
      if (levels < bearer.source.stand) {
        const who = this.leader()?.name ?? "Someone";
        for (const id of monsters) this.seen.add(id);
        this.emit(
          "shard",
          `${who} takes one look and calls the party back. Not with these heroes, not today.`,
        );
        return "none";
      }
    }
    // Nobody talks a shard-bearer out of a fight.
    if (monsters.length && !opts.cornered && !bearer && this.reacts(monsters)) return "none";
    if (monsters.length && !opts.cornered && this.sneakPast(monsters)) return "none";
    if (monsters.length && !opts.cornered && this.slipPast(monsters)) return "none";
    // Monsters on this floor may have picked up a lost hero's gear.
    const loose = this.extras.gear?.[this.depth]?.filter((g) => !this.gearTaken.includes(g.id));
    let carried: { gear: CarriedGear; index: number } | undefined;
    if (loose?.length && monsters.length && this.rng.chance(this.ix.lib.rescue.carryChance)) {
      carried = {
        gear: this.rng.pick(loose),
        index: this.rng.int(0, monsters.length - 1),
      };
    }
    // A risen guild mate haunting this floor may join the fight (DESIGN.md §10).
    const risen = this.risenJoins(monsters);
    if (monsters.length) this.desertions(monsters);
    const lead = this.extras.leader?.id;
    const leaderUp = !!lead && this.conscious().some((h) => h.id === lead);
    const result = runCombat(this.ix, this.party, monsters, {
      seed: this.rng.int(0, 2 ** 31 - 1),
      surprise: opts.surprise,
      level: this.floors?.[this.depth - 1]?.level ?? this.depth,
      carrying: carried && { index: carried.index, item: carried.gear.item },
      risen: risen.map((r) => risenHero(this.ix, r)),
      ...(lead ? { leader: lead } : {}),
      ...(this.extras.research ? { research: this.extras.research } : {}),
      ...(this.ix.floor(this.depth).ground ? { ground: this.ix.floor(this.depth).ground } : {}),
      ...(this.ix.lib.ties.length ? { bonds: bondsFor(this.ix, this.conscious()) } : {}),
    });
    const summoned = new Set(result.log.filter((e) => e.kind === "summon").map((e) => e.target));
    const foes = result.fighters.filter((f) => f.side === "monsters" && !summoned.has(f.uid));
    for (const f of foes) if (f.monsterId) this.seen.add(f.monsterId);
    const heroes = list(this.conscious().map((h) => h.name));
    this.emit("fight", `${heroes} face ${list(foes.map((f) => f.name))}.`, {
      monsters: foes.map(foeSheet),
    });
    for (const r of risen) this.meetRisen(r);
    const carrier = carried && foes[carried.index];
    if (carried && carrier) {
      const whose = carried.gear.owner ? `${carried.gear.owner}'s` : "a lost hero's";
      this.emit(
        "fight",
        `${carrier.name} has ${whose} ${this.ix.item(carried.gear.item).name.toLowerCase()}!`,
      );
    }
    for (const e of result.log) {
      if (e.kind === "start") continue;
      this.emit("combat", e.text, { combat: e });
    }
    const clock = this.ix.lib.time.fight;
    this.pass(clock.hours + Math.max(0, result.rounds - clock.freeRounds) * clock.perRound);
    this.party = result.party;
    this.kills.push(...result.kills);
    const real = result.kills.filter((id) => !this.ix.monster(id).summonOnly).length;
    if (real) {
      this.floorKills[this.depth] = (this.floorKills[this.depth] ?? 0) + real;
      const today = (this.dayKills[this.tripDay()] ??= {});
      today[this.depth] = (today[this.depth] ?? 0) + real;
      const f = this.floors?.[this.depth - 1];
      if (f) f.population = Math.max(0, f.population - real);
    }

    if (result.winner === "monsters") this.wiped = true;
    else if (result.fled) this.fledFrom = this.ix.monster(result.fled).name;
    else if (result.winner === "none") this.emit("fight", "The monsters slink off into the dark.");
    else {
      if (lead && this.looksBad(monsters, this.ix.lib.leadership.bigWin)) this.bigWins++;
      for (const id of result.kills) {
        const table = this.ix.monster(id).loot;
        if (table) this.findLoot(table, `on the ${this.ix.monster(id).name}`, false);
      }
      if (carried && carrier?.state === "dead") {
        const def = this.ix.item(carried.gear.item);
        this.gearTaken.push(carried.gear.id);
        const owner = carried.gear.owner;
        this.haul.push({
          item: def.id,
          value: def.value,
          estimate: def.value,
          keep: true,
          owner,
        });
        this.emit("loot", `Got ${owner ? `${owner}'s` : "the"} ${def.name.toLowerCase()} back!`);
        this.repack();
      }
      for (const r of risen) if (result.risenSlain.includes(r.id)) this.putDown(r);
      if (bearer?.source.kind === "bearer" && result.kills.includes(bearer.source.monster)) {
        const who = this.conscious()[0]?.name ?? "Someone";
        const name = this.ix.monster(bearer.source.monster).name;
        this.emit(
          "shard",
          `${name} is dead. ${who} pries a shard of the Hearthstone from what's left.`,
        );
        this.takeShard(bearer.source.id);
      }
      if (result.kills.length) this.moments({ kind: "fight", monsters: result.kills });
    }
    // The leader goes down (M7.05): the party may lose heart.
    const leaderNow = lead && this.party.find((h) => h.id === lead);
    if (leaderUp && leaderNow && leaderNow.condition !== "ok" && !this.wiped) {
      this.leaderFell = true;
      this.leaderShaken = true;
      this.emit(
        "leader",
        `${leaderNow.name} ${leaderNow.condition === "dead" ? "is dead" : "is down"}, and the party looks to each other.`,
      );
    }
    return result.winner;
  }

  /**
   * A rescue mission (M7.02) travels light, and a scout mission (M7.08)
   * keeps out of sight: the best scout may lead the party quietly past a
   * fight, (Scouting + slipBase)%, at most slipMax. Scouts still count what
   * they slipped past, and it counts as a meeting.
   */
  protected slipPast(monsters: readonly string[]): boolean {
    const scouting = this.scouting();
    const rs = this.onRescue() ? this.ix.lib.rescue : scouting ? this.ix.lib.scouting : undefined;
    if (!rs) return false;
    const scout = this.best("scouting");
    const chance = Math.min(rs.slipMax, Math.max(0, ((scout?.value ?? 0) + rs.slipBase) / 100));
    if (!scout || !this.rng.chance(chance)) return false;
    const names = [...new Set(monsters.map((id) => this.ix.monster(id).name.toLowerCase()))];
    if (scouting) {
      this.slipped++;
      const n = this.notes();
      if (n) n.slipped++;
      for (const id of monsters) this.seen.add(id);
      this.emit(
        "scout",
        `${scout.hero.name} counts the ${list(names)} from the shadows and leads the party quietly round them.`,
      );
      return true;
    }
    this.emit("scout", `${scout.hero.name} leads the party quietly past the ${list(names)}.`);
    return true;
  }

  /**
   * A sneak party (M7.08, DESIGN.md §17.8) tries to get past every group
   * unheard: its worst Stealth against the group's sharpest ear. Heard means
   * a fight.
   */
  protected sneakPast(monsters: readonly string[]): boolean {
    if (!this.sneaking()) return false;
    const up = this.conscious();
    if (!up.length) return false;
    const quiet = partyStealth(this.ix, up);
    const names = [...new Set(monsters.map((id) => this.ix.monster(id).name.toLowerCase()))];
    if (this.rng.chance(sneakChance(this.ix, quiet.value, monsters))) {
      this.sneaked.past++;
      for (const id of monsters) this.seen.add(id);
      this.emit("scout", `The party creeps past the ${list(names)} without a sound.`);
      return true;
    }
    this.sneaked.heard++;
    const who = quiet.hero && up.length > 1 ? `${quiet.hero.name} makes a noise and the` : "The";
    this.emit("scout", `${who} ${list(names)} hear the party coming.`);
    return false;
  }

  /** Scouts (M7.08) note every group they meet, fought or not. */
  protected count(monsters: readonly string[]): void {
    const n = this.notes();
    if (!n) return;
    n.groups++;
    for (const id of monsters) n.monsters[id] = (n.monsters[id] ?? 0) + 1;
  }

  /** Risen heroes on this floor who come out for this fight: each at most once a trip. */
  protected risenJoins(monsters: readonly string[]): Risen[] {
    if (!monsters.length) return [];
    const here = (this.extras.risen ?? []).filter(
      (r) => r.floor === this.depth && !this.risenMet.includes(r.id),
    );
    const out: Risen[] = [];
    for (const r of here) {
      if (!this.rng.chance(this.ix.lib.fallen.meetChance)) continue;
      this.risenMet.push(r.id);
      out.push(r);
    }
    return out;
  }

  /** The party sees who it's fighting, or a scout works it out first. */
  protected meetRisen(r: Risen): void {
    const name = r.body.hero.name;
    const scout = this.best("scouting");
    const chance = this.ix.lib.fallen.recogniseBase + (scout?.value ?? 0) / 100;
    const kit = Object.values(r.equipment).filter((id): id is string => !!id);
    if (scout && this.rng.chance(chance)) {
      const thing = kit.length ? this.ix.item(this.rng.pick(kit)).name.toLowerCase() : "face";
      this.emit(
        "fight",
        `${scout.hero.name} knows that ${thing} at once. "That's... that's ${name}'s ${thing}." It's ${risenName(this.ix, r)}.`,
      );
    } else {
      this.emit(
        "fight",
        `Something that was ${name} lurches out of the dark: ${risenName(this.ix, r)}.`,
      );
    }
  }

  /** A risen guild mate is put down: their gear and their body come home. */
  protected putDown(r: Risen): void {
    this.risenSlain.push(r.id);
    const name = r.body.hero.name;
    for (const id of Object.values(r.equipment)) {
      if (!id) continue;
      const def = this.ix.item(id);
      this.haul.push({ item: id, value: def.value, estimate: def.value, keep: true, owner: name });
      this.emit("loot", `Got ${name}'s ${def.name.toLowerCase()} back.`);
    }
    this.bodies.push({ ...r.body, floor: this.depth, risen: true });
    this.emit(
      "site",
      `${name} is still at last. The party wraps what's left of them to bring home.`,
    );
    this.repack();
  }
}
