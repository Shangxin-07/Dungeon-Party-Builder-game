/**
 * Running a trip: down, room by room, look after the party between rooms,
 * check orders, come home. Tuning numbers are at the top.
 */
import type { DamageType } from "../../content/types";
import { foeSheet, runCombat, type Side } from "../combat";
import type { FloorPressure } from "../dungeon";
import { rollEncounter } from "../encounter";
import { risenHero, risenName, type Body, type Risen } from "../fallen";
import { heroSheet, type Hero } from "../hero";
import type { Index } from "../library";
import { appraise, itemSize, rollLootTable, rollValue, worthPerSlot, type HaulItem } from "../loot";
import { createRng, type Rng } from "../rng";
import { getRoom, type RoomContext } from "../rooms";
import { resistance } from "../stats";
import { type StandingOrders, describeRetreat } from "./orders";
import type {
  ExpeditionEventKind,
  HeroStatus,
  ExpeditionEvent,
  ExpeditionResult,
  SiteVisit,
  CarriedGear,
  ExpeditionExtras,
} from "./report";

/** Carry slots a downed hero takes up when someone has to carry them. */
export const DOWNED_LOAD = 4;

/** Chance per floor of meeting wandering monsters on the way back up. */
export const WANDER_CHANCE = 0.2;

/** Mana regained per room walked: WIL ÷ this, rounded up. */
export const MANA_REGEN_DIVISOR = 4;

/** Bandages are used on heroes below this share of max HP. */
export const BANDAGE_BELOW = 0.6;

/** Chance to get a downed hero up = BASE + SCALE × Medicine/100. */
export const REVIVE_BASE = 0.3;

export const REVIVE_SCALE = 0.6;

/** With the "valuable" loot rule, finds worth less than this per slot are left. */
export const VALUABLE_PER_SLOT = 8;

/**
 * Simulate a whole trip. `floors` is the dungeon as it is today (index 0 =
 * floor 1); without it every floor is at its usual level with plenty of monsters.
 */
export function runExpedition(
  ix: Index,
  party: readonly Hero[],
  orders: StandingOrders,
  seed: number,
  floors?: readonly FloorPressure[],
  extras: ExpeditionExtras = {},
): ExpeditionResult {
  return new Expedition(ix, party, orders, createRng(seed), floors, extras, seed).run();
}

/** Pick the rooms for one floor: random rooms, with the floor's fixed rooms placed mid-floor. */
export function planFloor(ix: Index, depth: number, rng: Rng): string[] {
  const floor = ix.floor(depth);
  // Fixed rooms are placed once, below, never drawn at random.
  const fixed = floor.fixedRooms ?? [];
  const options = ix.lib.rooms.filter(
    (r) => depth >= r.floors[0] && depth <= r.floors[1] && !fixed.includes(r.id),
  );
  if (!options.length) throw new Error(`No rooms defined for floor ${depth}`);
  const total = options.reduce((s, r) => s + r.weight, 0);
  const count = rng.int(floor.rooms[0], floor.rooms[1]);
  const rooms: string[] = [];
  for (let i = 0; i < count; i++) {
    let roll = rng.next() * total;
    rooms.push((options.find((r) => (roll -= r.weight) < 0) ?? options.at(-1)!).id);
  }
  // Fixed rooms never come first or last: you rest partway through a floor.
  const free = rooms.map((_, i) => i).filter((i) => count <= 2 || (i > 0 && i < count - 1));
  for (const id of fixed) {
    if (!free.length) break;
    rooms[free.splice(rng.int(0, free.length - 1), 1)[0]!] = id;
  }
  return rooms;
}

export const an = (name: string) => (/^[aeiou]/i.test(name) ? `an ${name}` : `a ${name}`);

export const list = (items: string[]) =>
  items.length > 1 ? `${items.slice(0, -1).join(", ")} and ${items.at(-1)}` : (items[0] ?? "");

export class Expedition {
  private party: Hero[];
  private haul: HaulItem[] = [];
  private kills: string[] = [];
  private floorKills: Record<number, number> = {};
  private log: ExpeditionEvent[] = [];
  private depth = 0;
  private roomNo = 0;
  private deepest = 0;
  /** The first floor the party walks; the cage carries them past the ones above. */
  private first = 1;
  private roomsVisited = 0;
  private wiped = false;
  /** Downed heroes we've already said are being carried, so the log doesn't repeat it. */
  private carried = new Set<string>();
  private orders: StandingOrders;
  private seen = new Set<string>();
  /** Freed trapped heroes walking out with the party. They don't fight. */
  private followers: Hero[] = [];
  private siteVisited?: string;
  private siteLeft: HaulItem[] = [];
  private gearTaken: string[] = [];
  private bodies: Body[] = [];
  private risenMet: string[] = [];
  private risenSlain: string[] = [];
  private disobeyed = 0;
  private secretRng: Rng;
  /** "Clear the floor" orders: the target floor's population on arrival, and rooms hunted. */
  private huntStart = 0;
  private hunts = 0;
  private secrets = { found: 0, missed: 0 };
  /** True while rolling a hidden cache's loot, so its items are marked. */
  private searching = false;
  /** Hero id → floor they last refused to turn back on (once per floor each). */
  private refused = new Map<string, number>();

  constructor(
    private ix: Index,
    party: readonly Hero[],
    orders: StandingOrders,
    private rng: Rng,
    private floors?: readonly FloorPressure[],
    private extras: ExpeditionExtras = {},
    seed = 0,
  ) {
    // Hidden caches roll on their own stream, so adding or tuning them
    // doesn't change what happens in the rest of the trip.
    this.secretRng = createRng((seed ^ 0x5ec2e7) >>> 0);
    this.floors = floors?.map((f) => ({ ...f }));
    this.party = party.map((h) => ({
      ...h,
      stats: { ...h.stats },
      perks: [...h.perks],
      equipment: { ...h.equipment },
      pack: [...h.pack],
    }));
    const deepest = Math.max(...ix.lib.floors.map((f) => f.depth));
    this.orders = {
      ...orders,
      targetFloor: Math.max(1, Math.min(deepest, orders.targetFloor)),
    };
  }

  run(): ExpeditionResult {
    const { targetFloor, retreat, loot } = this.orders;
    const porters = this.extras.porters ?? [];
    const names =
      list(this.conscious().map((h) => h.name)) +
      (porters.length ? `, with ${list(porters.map((p) => p.name))} carrying,` : "");
    const site = this.extras.site;
    const mission = site
      ? `floor ${site.floor} to find ${site.trapped.length ? list(site.trapped.map((h) => h.name)) : "the lost party"}`
      : `floor ${targetFloor}`;
    this.emit(
      "depart",
      `${names} set off for ${mission}. Orders: ${describeRetreat(retreat)}; ` +
        `${loot === "everything" ? "carry everything" : "leave the junk"}` +
        `${this.huntGoal() ? `; thin out floor ${targetFloor} by ${this.orders.clearPercent}%` : ""}.`,
    );

    // The Mine Cage: ride past the top floors, but never the target floor, nor
    // a floor a rescue party has to search.
    this.first = Math.max(
      1,
      Math.min(1 + Math.floor(this.extras.lift ?? 0), targetFloor, site?.floor ?? targetFloor),
    );
    if (this.first > 1)
      this.emit(
        "depart",
        `The party rides the cage down past ${this.first === 2 ? "floor 1" : `floors 1 to ${this.first - 1}`}.`,
      );

    for (let depth = this.first; depth <= targetFloor; depth++) {
      const floor = this.ix.floor(depth);
      const rooms = planFloor(this.ix, depth, this.rng);
      this.depth = depth;
      if (depth === targetFloor) this.huntStart = this.floors?.[depth - 1]?.population ?? 0;
      this.deepest = depth;
      this.roomNo = 0;
      this.emit("floor", `Floor ${depth}: ${floor.name}.`);

      for (let i = 0; i < rooms.length; i++) {
        const room = this.ix.room(rooms[i]!);
        this.roomNo = i + 1;
        this.roomsVisited++;
        this.emit("room", `${room.name}. ${this.rng.pick(room.descriptions)}`);
        getRoom(room.behaviour)(this.context(room.id));
        if (!this.wiped) this.search();
        if (!this.wiped) this.betweenRooms();
        if (this.wiped) return this.finish("wiped");

        const site = this.extras.site;
        if (site && !this.siteVisited && site.floor === depth) {
          if (i + 1 === Math.max(1, Math.min(site.room, rooms.length))) this.visitSite(site);
        }

        const lastRoom = depth === targetFloor && i === rooms.length - 1 && !this.huntGoal();
        const reason = lastRoom ? undefined : this.retreatReason();
        if (reason) {
          const rebel = this.refuser();
          if (rebel) {
            this.disobeyed++;
            this.emit(
              "disobey",
              `${reason}, but ${rebel.name} won't hear of turning back. The party presses on.`,
            );
            continue;
          }
          this.emit("retreat", `${reason}. Following orders, the party turns back.`);
          return this.goHome("retreated");
        }
      }
    }
    const hunted = this.hunt();
    if (hunted) return hunted;
    this.roomNo = 0;
    this.emit("retreat", `Floor ${targetFloor} is done. The party heads for home.`);
    return this.goHome("returned");
  }

  /** Kills on the target floor a "clear the floor" order asks for (0: no such order). */
  private huntGoal(): number {
    const pct = this.orders.clearPercent ?? 0;
    if (pct <= 0 || this.orders.rescue || !this.floors) return 0;
    const pop =
      this.depth === this.orders.targetFloor
        ? this.huntStart
        : (this.floors[this.orders.targetFloor - 1]?.population ?? 0);
    return Math.ceil((pop * Math.min(100, pct)) / 100);
  }

  /**
   * "Clear the floor by N%" (M6): stay on the target floor, searching room
   * after room for monsters, until enough are dead, the floor is empty, the
   * party has hunted as long as it can, or the retreat orders say go home.
   * Returns the trip's result if it ended here, else undefined.
   */
  private hunt(): ExpeditionResult | undefined {
    const goal = this.huntGoal();
    if (!goal) return undefined;
    const rules = this.ix.lib.dungeon.hunting;
    const depth = this.depth;
    const killed = () => this.floorKills[depth] ?? 0;
    const lair = this.ix.lib.rooms.find(
      (r) => r.behaviour === "fight" && r.floors[0] <= depth && depth <= r.floors[1],
    );
    let rooms = this.roomNo;
    while (killed() < goal && this.hunts < rules.maxRooms) {
      const left = this.floors?.[depth - 1]?.population ?? 0;
      if (left <= 0) break;
      const reason = this.retreatReason();
      if (reason) {
        this.emit("retreat", `${reason}. Following orders, the party stops hunting.`);
        return this.goHome("retreated");
      }
      this.hunts++;
      this.roomNo = ++rooms;
      this.roomsVisited++;
      this.emit(
        "room",
        `Hunting: ${killed()} of ${goal} killed. The party searches the side tunnels.`,
      );
      if (lair) getRoom(lair.behaviour)(this.context(lair.id));
      else {
        const monsters = this.rollMonsters();
        if (monsters.length) this.fight(monsters);
      }
      if (!this.wiped) this.search();
      if (!this.wiped) this.betweenRooms();
      if (this.wiped) return this.finish("wiped");
    }
    this.roomNo = 0;
    const done = killed() >= goal;
    this.emit(
      "retreat",
      done
        ? `Floor ${depth} is thinned out: ${killed()} monsters killed. The party heads for home.`
        : `The party has hunted as long as it can (${killed()} of ${goal} killed) and heads for home.`,
    );
    return this.goHome("returned");
  }

  /** Climb back up. Cleared floors are quieter, but something may have wandered in. */
  private goHome(outcome: "returned" | "retreated"): ExpeditionResult {
    this.roomNo = 0;
    for (let d = this.depth; d >= this.first; d--) {
      this.depth = d;
      if (!this.rng.chance(WANDER_CHANCE)) continue;
      const monsters = this.rollMonsters();
      if (!monsters.length) continue;
      this.emit("wander", `On the way up through floor ${d}, something blocks the tunnel.`);
      this.fight(monsters);
      if (!this.wiped) this.betweenRooms();
      if (this.wiped) return this.finish("wiped");
    }
    this.depth = 0;
    if (this.first > 1)
      this.emit(
        "home",
        `The cage hauls them up the last ${this.first - 1 === 1 ? "floor" : `${this.first - 1} floors`}.`,
      );
    const back = list([...this.alive(), ...this.followers].map((h) => h.name));
    this.emit("home", `${back} climb out of the pit.`);
    return this.finish(outcome);
  }

  private finish(outcome: ExpeditionResult["outcome"]): ExpeditionResult {
    const wiped = outcome === "wiped";
    let porterHaul: HaulItem[] = [];
    const porters: ExpeditionResult["porters"] = [];
    if (wiped) {
      this.emit("wipe", "Nobody is left standing. The party lies where it fell.");
      porterHaul = this.portersRun(porters);
    } else {
      for (const p of this.extras.porters ?? [])
        porters.push({ id: p.id, name: p.name, home: true });
    }
    return {
      outcome,
      orders: this.orders,
      deepestFloor: this.deepest,
      days:
        Math.max(1, this.deepest - (this.first - 1)) +
        Math.ceil(this.hunts / Math.max(1, this.ix.lib.dungeon.hunting.roomsPerDay)),
      roomsVisited: this.roomsVisited,
      party: this.party,
      haul: wiped ? [] : this.haul,
      leftBehind: wiped ? this.haul.filter((h) => !porterHaul.includes(h)) : [],
      porterHaul,
      porters,
      kills: this.kills,
      floorKills: this.floorKills,
      log: this.log,
      wipeSite: wiped ? { floor: this.depth, room: this.roomNo } : undefined,
      seen: [...this.seen],
      rescued: this.followers,
      siteVisited: this.siteVisited,
      siteLeft: this.siteLeft,
      gearTaken: this.gearTaken,
      bodies: this.bodies,
      risenMet: this.risenMet,
      risenSlain: this.risenSlain,
      disobeyed: this.disobeyed,
      secrets: this.secrets,
      huntRooms: this.hunts,
    };
  }

  /**
   * The party has fallen: each porter drops what they can't run with and
   * makes for the surface (content/town.ts `porters.escape`). Those who make
   * it bring home the most valuable loot they can carry.
   */
  private portersRun(out: ExpeditionResult["porters"]): HaulItem[] {
    const esc = this.ix.lib.town.porters.escape;
    const loose = [...this.haul].sort(
      (a, b) => worthPerSlot(this.ix, b) - worthPerSlot(this.ix, a),
    );
    const saved: HaulItem[] = [];
    for (const p of this.extras.porters ?? []) {
      const sheet = heroSheet(this.ix, p);
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
      out.push({ id: p.id, name: p.name, home });
      if (!home) {
        this.emit("porter", `${p.name} runs for the stairs, but doesn't make it.`);
        continue;
      }
      let room = sheet.derived.carrySlots;
      const took: string[] = [];
      for (const item of [...loose]) {
        if (item.keep) continue;
        const size = itemSize(this.ix.item(item.item));
        if (size > room) continue;
        room -= size;
        saved.push(item);
        loose.splice(loose.indexOf(item), 1);
        took.push(this.ix.item(item.item).name.toLowerCase());
      }
      this.emit(
        "porter",
        `${p.name} runs for it${took.length ? ` with ${list(took)}` : ""} and gets back to town.`,
      );
    }
    return saved;
  }

  /**
   * Hidden treasure (M6, content/secrets/): some rooms hide a cache that only
   * the party's best Scouting can find. Missed caches are counted but never
   * logged: the party doesn't know what it walked past.
   */
  private search(): void {
    const rules = this.ix.lib.searching;
    const rng = this.secretRng;
    if (!rng.chance(rules.chancePerRoom)) return;
    const options = this.ix.lib.secrets.filter(
      (x) => x.floors[0] <= this.depth && this.depth <= x.floors[1],
    );
    if (!options.length) return;
    let roll = rng.next() * options.reduce((t, x) => t + x.weight, 0);
    const secret = options.find((x) => (roll -= x.weight) < 0) ?? options.at(-1)!;
    const scout = this.best("scouting");
    const chance = Math.min(
      rules.maxChance,
      Math.max(0, ((scout?.value ?? 0) - secret.hidden) / rules.spread),
    );
    if (!scout || !rng.chance(chance)) {
      this.secrets.missed++;
      return;
    }
    this.secrets.found++;
    this.emit("secret", `${scout.hero.name} notices ${secret.spotted}.`);
    const main = this.rng;
    this.rng = rng;
    this.searching = true;
    try {
      this.findLoot(secret.loot, "in the hiding place", true);
    } finally {
      this.rng = main;
      this.searching = false;
    }
  }

  // -------------------------------------------------------------------------
  // Morale in the dungeon and rescue runs
  // -------------------------------------------------------------------------

  /**
   * A low-morale hero whose motivation makes them refuse to turn back
   * (DESIGN.md §6), if one does this time. Each can refuse once per floor.
   */
  private refuser(): Hero | undefined {
    for (const h of this.conscious()) {
      const chance = this.ix.motivation(h.motivation).lowMorale?.refuseRetreat;
      if (!chance || h.morale >= this.ix.lib.morale.low) continue;
      if (this.refused.get(h.id) === this.depth) continue;
      if (this.rng.chance(chance)) {
        this.refused.set(h.id, this.depth);
        return h;
      }
    }
    return undefined;
  }

  /** A low-morale hero who grabs junk whatever the loot orders say. */
  private greedy(): Hero | undefined {
    return this.conscious().find(
      (h) =>
        this.ix.motivation(h.motivation).lowMorale?.grabJunk && h.morale < this.ix.lib.morale.low,
    );
  }

  /** The rescue party reaches where the lost party fell (DESIGN.md §10). */
  private visitSite(site: SiteVisit): void {
    this.siteVisited = site.id;
    const names = [...site.trapped.map((h) => h.name), ...site.bodies.map((b) => b.hero.name)];
    this.emit(
      "site",
      names.length
        ? `The party finds the place where ${list(names)} fell.`
        : "The party finds the place where the lost party fell.",
    );
    const pct = this.ix.lib.rescue.rescuedHpPercent;
    for (const h of site.trapped) {
      const hero = structuredClone(h);
      hero.hp = Math.max(1, Math.round((this.maxHp(hero) * pct) / 100));
      hero.mana = 0;
      hero.condition = "ok";
      this.followers.push(hero);
      this.emit(
        "site",
        `${h.name} is alive! Weak and starving, but alive. They'll walk out with the party.`,
      );
    }
    for (const b of site.bodies) {
      this.emit(
        "site",
        `There's nothing to be done for ${b.hero.name}. The party wraps the body to bring home.`,
      );
      this.bodies.push(b);
    }
    const items = [...site.items].sort(
      (a, b) =>
        Number(!!b.keep) - Number(!!a.keep) || worthPerSlot(this.ix, b) - worthPerSlot(this.ix, a),
    );
    for (const it of items) {
      const name = this.ix.item(it.item).name;
      this.haul.push(it);
      this.emit(
        "loot",
        it.owner
          ? `Recovered ${it.owner}'s ${name}.`
          : `Picked up the ${name.toLowerCase()} they'd found.`,
      );
    }
    this.repack();
    this.siteLeft = items.filter((it) => !this.haul.includes(it));
  }

  // -------------------------------------------------------------------------
  // The party
  // -------------------------------------------------------------------------

  private conscious = () => this.party.filter((h) => h.condition === "ok");
  private alive = () => this.party.filter((h) => h.condition !== "dead");
  private maxHp = (h: Hero) => heroSheet(this.ix, h).derived.maxHp;
  private maxMana = (h: Hero) => heroSheet(this.ix, h).derived.mana;

  private best(skill: string): { hero: Hero; value: number } | undefined {
    let best: { hero: Hero; value: number } | undefined;
    for (const hero of this.conscious()) {
      const value = heroSheet(this.ix, hero).skills[skill] ?? 0;
      if (!best || value > best.value) best = { hero, value };
    }
    return best;
  }

  private snapshot(): HeroStatus[] {
    return this.party.map((h) => ({
      uid: h.id,
      name: h.name,
      hp: h.hp,
      maxHp: this.maxHp(h),
      mana: h.mana,
      maxMana: this.maxMana(h),
      condition: h.condition,
    }));
  }

  private emit(
    kind: ExpeditionEventKind,
    text: string,
    extra: Partial<ExpeditionEvent> = {},
  ): void {
    const party = kind === "combat" ? undefined : this.snapshot();
    this.log.push({
      kind,
      text,
      floor: this.depth,
      room: this.roomNo,
      party,
      ...extra,
    });
  }

  private context(roomId: string): RoomContext {
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
  private rollMonsters(): string[] {
    const f = this.floors?.[this.depth - 1];
    if (!f) return rollEncounter(this.ix, this.depth, this.rng);
    if (f.population <= 0) return [];
    return rollEncounter(this.ix, this.depth, this.rng, {
      level: f.level,
      max: f.population,
    });
  }

  private fight(monsters: readonly string[], opts: { surprise?: boolean } = {}): Side | "none" {
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
  private risenJoins(monsters: readonly string[]): Risen[] {
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
  private meetRisen(r: Risen): void {
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
  private putDown(r: Risen): void {
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

  /** Trap damage and the like. Resistances help; armour doesn't. */
  private hurt(hero: Hero, raw: number, type: DamageType): void {
    if (hero.condition !== "ok") return;
    const resist = resistance(heroSheet(this.ix, hero).passives, type);
    const amount = resist >= 100 ? 0 : Math.max(1, Math.round(raw * (1 - resist / 100)));
    hero.hp = Math.max(0, hero.hp - amount);
    this.emit("trap", `${hero.name} takes ${amount} ${type} damage.`);
    if (hero.hp === 0) {
      hero.condition = "downed";
      this.emit("trap", `${hero.name} goes down!`);
    }
  }

  private heal(hero: Hero, amount: number): number {
    if (hero.condition === "dead" || amount <= 0) return 0;
    const before = hero.hp;
    hero.hp = Math.min(this.maxHp(hero), hero.hp + amount);
    if (hero.condition === "downed" && hero.hp > 0) {
      hero.condition = "ok";
      this.carried.delete(hero.id);
      this.emit("medicine", `${hero.name} is back on their feet.`);
    }
    return hero.hp - before;
  }

  private restoreMana(hero: Hero, amount: number): number {
    if (hero.condition === "dead") return 0;
    const before = hero.mana;
    hero.mana = Math.min(this.maxMana(hero), hero.mana + amount);
    return hero.mana - before;
  }

  // -------------------------------------------------------------------------
  // Between rooms: catch breath, first aid, repack
  // -------------------------------------------------------------------------

  private betweenRooms(): void {
    for (const h of this.conscious()) {
      const wil = heroSheet(this.ix, h).stats.WIL;
      this.restoreMana(h, Math.ceil(wil / MANA_REGEN_DIVISOR));
    }
    this.firstAid();
    this.repack();
    if (!this.conscious().length) this.wiped = true;
  }

  /**
   * The best Medicine in the party tries to get downed heroes up, then uses
   * bandages on the worst wounds. Good Medicine gets more out of each bandage.
   */
  private firstAid(): void {
    const medic = this.best("medicine");
    if (!medic) return;
    const skill = medic.value / 100;

    for (const h of this.party.filter((x) => x.condition === "downed")) {
      if (this.rng.chance(REVIVE_BASE + REVIVE_SCALE * skill)) {
        this.emit("medicine", `${medic.hero.name} tends to ${h.name}.`);
        this.heal(h, 1 + Math.floor(medic.value / 10));
      } else if (!this.carried.has(h.id)) {
        this.carried.add(h.id);
        const text = `${medic.hero.name} can't bring ${h.name} round. They'll be carried.`;
        this.emit("medicine", text);
      }
    }

    for (;;) {
      const patient = this.conscious()
        .filter((h) => h.hp < this.maxHp(h) * BANDAGE_BELOW)
        .sort((a, b) => a.hp / this.maxHp(a) - b.hp / this.maxHp(b))[0];
      if (!patient) return;
      const holder = this.alive().find((h) => h.pack.some((id) => this.isFirstAid(id)));
      if (!holder) return;
      const idx = holder.pack.findIndex((id) => this.isFirstAid(id));
      const item = this.ix.item(holder.pack.splice(idx, 1)[0]!);
      const base = (item.use ?? []).reduce((s, e) => s + (e.type === "heal" ? e.amount : 0), 0);
      const gained = this.heal(patient, Math.round(base * (1 + skill)));
      this.emit(
        "medicine",
        `${medic.hero.name} uses ${item.name.toLowerCase()} on ${patient.name} (+${gained} HP).`,
      );
    }
  }

  private isFirstAid = (id: string) => this.ix.item(id).tags.includes("first-aid");

  // -------------------------------------------------------------------------
  // Loot and carrying
  // -------------------------------------------------------------------------

  /** Free carry slots: everyone standing carries, downed heroes are carried, and so do porters. */
  private capacity(): number {
    let slots = 0;
    for (const p of this.extras.porters ?? []) slots += heroSheet(this.ix, p).derived.carrySlots;
    for (const h of this.conscious()) {
      slots += heroSheet(this.ix, h).derived.carrySlots - h.pack.length;
    }
    slots -= DOWNED_LOAD * this.party.filter((h) => h.condition === "downed").length;
    return slots;
  }

  private load = () => this.haul.reduce((s, h) => s + itemSize(this.ix.item(h.item)), 0);

  private findLoot(tableId: string, from: string, sayIfEmpty: boolean): void {
    const found = rollLootTable(this.ix, tableId, this.rng);
    if (!found.length) {
      if (sayIfEmpty) this.emit("loot", `Nothing worth taking in ${from}.`);
      return;
    }
    const appraiser = this.best("appraisal");
    for (const id of found) {
      const def = this.ix.item(id);
      if (def.slot === "consumable") {
        const taker = [...this.conscious()].sort((a, b) => a.pack.length - b.pack.length)[0];
        if (!taker) return;
        taker.pack.push(id);
        this.emit("loot", `${taker.name} finds ${an(def.name)} ${from}.`);
        continue;
      }
      const value = rollValue(def, this.rng);
      const estimate = appraise(value, appraiser?.value ?? 0, this.rng);
      const item: HaulItem = { item: id, value, estimate };
      if (this.searching) item.hidden = true;
      this.emit("loot", `Found ${an(def.name)} ${from} (worth about ${item.estimate}).`);
      if (this.orders.loot === "valuable" && worthPerSlot(this.ix, item) < VALUABLE_PER_SLOT) {
        const grabber = this.greedy();
        if (grabber) {
          this.disobeyed++;
          this.emit("disobey", `Orders say leave the junk, but ${grabber.name} pockets it anyway.`);
        } else {
          const who = appraiser ? `${appraiser.hero.name} reckons it` : "It";
          this.emit("drop", `${who} isn't worth the space. Left behind.`);
          continue;
        }
      }
      this.haul.push(item);
      this.repack();
    }
  }

  /** If the haul doesn't fit, leave behind whatever looks least valuable per slot. */
  private repack(): void {
    const room = this.capacity();
    while (this.haul.length && this.load() > room) {
      let worst = 0;
      this.haul.forEach((h, i) => {
        if (worthPerSlot(this.ix, h) <= worthPerSlot(this.ix, this.haul[worst]!)) worst = i;
      });
      const [dropped] = this.haul.splice(worst, 1);
      const name = this.ix.item(dropped!.item).name.toLowerCase();
      const who = this.best("appraisal")?.hero.name ?? "Someone";
      const worth = dropped!.estimate;
      this.emit("drop", `Packs are full. ${who} leaves the ${name} behind (worth about ${worth}).`);
    }
  }

  // -------------------------------------------------------------------------
  // Standing orders
  // -------------------------------------------------------------------------

  private retreatReason(): string | undefined {
    const rule = this.orders.retreat;
    const fallen = this.party.find((h) => h.condition !== "ok");
    const why = fallen && `${fallen.name} ${fallen.condition === "dead" ? "is dead" : "is down"}`;
    switch (rule.kind) {
      case "never":
        return undefined;
      case "hero-downed":
        return why;
      case "hero-hp-below": {
        if (why) return why;
        const hurt = this.conscious().find((h) => h.hp < (this.maxHp(h) * rule.percent) / 100);
        return hurt ? `${hurt.name} is badly hurt` : undefined;
      }
      case "out-of-potions": {
        const isPotion = (id: string) => this.ix.item(id).tags.includes("potion");
        const any = this.alive().some((h) => h.pack.some(isPotion));
        return any ? undefined : "The last potion is gone";
      }
    }
  }
}
