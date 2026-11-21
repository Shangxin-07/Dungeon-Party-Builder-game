/**
 * Rooms and fights: what a room handler can do, which monsters turn up, the
 * fight itself, and the risen who walk the floors.
 */
import { foeSheet, runCombat, type Side } from "../combat";
import { rollEncounter } from "../encounter";
import { risenHero, risenName, type Risen } from "../fallen";
import { type RoomContext } from "../rooms";
import type { CarriedGear } from "./report";
import { list } from "./trip";
import { TripCare } from "./care";

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
    };
  }

  // -------------------------------------------------------------------------
  // Fights
  // -------------------------------------------------------------------------

  /** A group of monsters from the current floor, as it is today. Empty if it's been cleared out. */
  protected rollMonsters(): string[] {
    const f = this.floors?.[this.depth - 1];
    if (!f) return rollEncounter(this.ix, this.depth, this.rng);
    if (f.population <= 0) return [];
    return rollEncounter(this.ix, this.depth, this.rng, {
      level: f.level,
      max: f.population,
    });
  }

  protected fight(monsters: readonly string[], opts: { surprise?: boolean } = {}): Side | "none" {
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
    const result = runCombat(this.ix, this.party, monsters, {
      seed: this.rng.int(0, 2 ** 31 - 1),
      surprise: opts.surprise,
      level: this.floors?.[this.depth - 1]?.level ?? this.depth,
      carrying: carried && { index: carried.index, item: carried.gear.item },
      risen: risen.map((r) => risenHero(this.ix, r)),
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
    this.party = result.party;
    this.kills.push(...result.kills);
    const real = result.kills.filter((id) => !this.ix.monster(id).summonOnly).length;
    if (real) {
      this.floorKills[this.depth] = (this.floorKills[this.depth] ?? 0) + real;
      const f = this.floors?.[this.depth - 1];
      if (f) f.population = Math.max(0, f.population - real);
    }

    if (result.winner === "monsters") this.wiped = true;
    else if (result.winner === "none") this.emit("fight", "The monsters slink off into the dark.");
    else {
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
    }
    return result.winner;
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
