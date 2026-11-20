/**
 * Expeditions (DESIGN.md §11). A party walks down through the floors one room
 * at a time, following the standing orders it was given in town, then climbs
 * back out. Fully automatic and deterministic: same seed + same party + same
 * orders = the same trip, room for room.
 *
 * Floors, rooms, loot and traps are content. Room behaviours are registered
 * in rooms.ts. This file only knows the shape of a trip: down, room by room,
 * look after the party between rooms, check orders, come home.
 */
import type { DamageType } from "../content/types";
import { runCombat, type CombatEvent, type Side } from "./combat";
import type { FloorPressure } from "./dungeon";
import { rollEncounter } from "./encounter";
import { heroSheet, type Hero } from "./hero";
import type { Index } from "./library";
import { appraise, itemSize, rollLootTable, rollValue, worthPerSlot, type HaulItem } from "./loot";
import { createRng, type Rng } from "./rng";
import { getRoom, type RoomContext } from "./rooms";
import { resistance } from "./stats";

// ---------------------------------------------------------------------------
// Standing orders (DESIGN.md §2): the player's only say once the party leaves.
// ---------------------------------------------------------------------------

export type RetreatRule =
  | { kind: "never" }
  /** Turn back when any hero drops below this share of max HP, or goes down. */
  | { kind: "hero-hp-below"; percent: number }
  /** Turn back as soon as anyone goes down. */
  | { kind: "hero-downed" }
  /** Turn back when the last potion is gone. */
  | { kind: "out-of-potions" };

/** "everything": carry anything that fits. "valuable": leave cheap junk behind. */
export type LootRule = "everything" | "valuable";

export interface StandingOrders {
  /** Clear down to this floor, then come home. */
  targetFloor: number;
  retreat: RetreatRule;
  loot: LootRule;
}

export const DEFAULT_ORDERS: StandingOrders = {
  targetFloor: 1,
  retreat: { kind: "hero-hp-below", percent: 30 },
  loot: "everything",
};

export function describeRetreat(rule: RetreatRule): string {
  switch (rule.kind) {
    case "never":
      return "never turn back";
    case "hero-hp-below":
      return `turn back if anyone drops below ${rule.percent}% HP`;
    case "hero-downed":
      return "turn back if anyone goes down";
    case "out-of-potions":
      return "turn back when the potions run out";
  }
}

// ---------------------------------------------------------------------------
// The trip report
// ---------------------------------------------------------------------------

export type ExpeditionEventKind =
  | "depart"
  | "floor"
  | "room"
  | "scout"
  | "trap"
  | "fight"
  | "combat"
  | "loot"
  | "drop"
  | "medicine"
  | "rest"
  | "retreat"
  | "wander"
  | "home"
  | "wipe"
  /** A fight room with nothing left alive in it. */
  | "quiet"
  /** Raids on the town reuse the trip log format. */
  | "raid";

/** A hero's condition at a point in the trip. */
export interface HeroStatus {
  uid: string;
  name: string;
  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  condition: Hero["condition"];
}

export interface ExpeditionEvent {
  kind: ExpeditionEventKind;
  text: string;
  /** Floor depth (0 = in town). */
  floor: number;
  /** Room number on this floor, from 1 (0 = between rooms). */
  room: number;
  /** "combat" events: the line from the battle report. */
  combat?: CombatEvent;
  /** "fight" events: the monsters at the start of the fight. */
  monsters?: { uid: string; name: string; hp: number; max: number }[];
  /** Every event except "combat": the party after it happened. */
  party?: HeroStatus[];
}

export interface ExpeditionResult {
  /**
   * "returned": did what it was told. "retreated": turned back early.
   * "wiped": nobody left standing.
   */
  outcome: "returned" | "retreated" | "wiped";
  orders: StandingOrders;
  deepestFloor: number;
  /** In-game days the trip took (DESIGN.md decision 2). */
  days: number;
  roomsVisited: number;
  /** The heroes as they came home (or where they fell). */
  party: Hero[];
  /** Loot carried out. Empty after a wipe: it stays with the fallen. */
  haul: HaulItem[];
  /** Haul left at the wipe site, for a rescue party to recover later. */
  leftBehind: HaulItem[];
  kills: string[];
  /** Monsters killed on each floor (summoned ones don't count), for the dungeon's population. */
  floorKills: Record<number, number>;
  log: ExpeditionEvent[];
  /** Where the party fell, if it was wiped. */
  wipeSite?: { floor: number; room: number };
}

// ---------------------------------------------------------------------------
// Tuning
// ---------------------------------------------------------------------------

/** Carry slots a downed hero takes up when someone has to carry them. */
export const DOWNED_LOAD = 4;
/** Chance per floor of meeting wandering monsters on the way back up. */
const WANDER_CHANCE = 0.2;
/** Mana regained per room walked: WIL ÷ this, rounded up. */
const MANA_REGEN_DIVISOR = 4;
/** Bandages are used on heroes below this share of max HP. */
const BANDAGE_BELOW = 0.6;
/** Chance to get a downed hero up = BASE + SCALE × Medicine/100. */
const REVIVE_BASE = 0.3;
const REVIVE_SCALE = 0.6;
/** With the "valuable" loot rule, finds worth less than this per slot are left. */
const VALUABLE_PER_SLOT = 8;

// ---------------------------------------------------------------------------

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
): ExpeditionResult {
  return new Expedition(ix, party, orders, createRng(seed), floors).run();
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

const an = (name: string) => (/^[aeiou]/i.test(name) ? `an ${name}` : `a ${name}`);
const list = (items: string[]) =>
  items.length > 1 ? `${items.slice(0, -1).join(", ")} and ${items.at(-1)}` : (items[0] ?? "");

class Expedition {
  private party: Hero[];
  private haul: HaulItem[] = [];
  private kills: string[] = [];
  private floorKills: Record<number, number> = {};
  private log: ExpeditionEvent[] = [];
  private depth = 0;
  private roomNo = 0;
  private deepest = 0;
  private roomsVisited = 0;
  private wiped = false;
  /** Downed heroes we've already said are being carried, so the log doesn't repeat it. */
  private carried = new Set<string>();
  private orders: StandingOrders;

  constructor(
    private ix: Index,
    party: readonly Hero[],
    orders: StandingOrders,
    private rng: Rng,
    private floors?: readonly FloorPressure[],
  ) {
    this.floors = floors?.map((f) => ({ ...f }));
    this.party = party.map((h) => ({
      ...h,
      stats: { ...h.stats },
      perks: [...h.perks],
      equipment: { ...h.equipment },
      pack: [...h.pack],
    }));
    const deepest = Math.max(...ix.lib.floors.map((f) => f.depth));
    this.orders = { ...orders, targetFloor: Math.max(1, Math.min(deepest, orders.targetFloor)) };
  }

  run(): ExpeditionResult {
    const { targetFloor, retreat, loot } = this.orders;
    const names = list(this.conscious().map((h) => h.name));
    this.emit(
      "depart",
      `${names} set off for floor ${targetFloor}. Orders: ${describeRetreat(retreat)}; ` +
        `${loot === "everything" ? "carry everything" : "leave the junk"}.`,
    );

    for (let depth = 1; depth <= targetFloor; depth++) {
      const floor = this.ix.floor(depth);
      const rooms = planFloor(this.ix, depth, this.rng);
      this.depth = depth;
      this.deepest = depth;
      this.roomNo = 0;
      this.emit("floor", `Floor ${depth}: ${floor.name}.`);

      for (let i = 0; i < rooms.length; i++) {
        const room = this.ix.room(rooms[i]!);
        this.roomNo = i + 1;
        this.roomsVisited++;
        this.emit("room", `${room.name}. ${this.rng.pick(room.descriptions)}`);
        getRoom(room.behaviour)(this.context(room.id));
        if (!this.wiped) this.betweenRooms();
        if (this.wiped) return this.finish("wiped");

        const lastRoom = depth === targetFloor && i === rooms.length - 1;
        const reason = lastRoom ? undefined : this.retreatReason();
        if (reason) {
          this.emit("retreat", `${reason}. Following orders, the party turns back.`);
          return this.goHome("retreated");
        }
      }
    }
    this.roomNo = 0;
    this.emit("retreat", `Floor ${targetFloor} is done. The party heads for home.`);
    return this.goHome("returned");
  }

  /** Climb back up. Cleared floors are quieter, but something may have wandered in. */
  private goHome(outcome: "returned" | "retreated"): ExpeditionResult {
    this.roomNo = 0;
    for (let d = this.depth; d >= 1; d--) {
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
    const back = list(this.alive().map((h) => h.name));
    this.emit("home", `${back} climb out of the pit.`);
    return this.finish(outcome);
  }

  private finish(outcome: ExpeditionResult["outcome"]): ExpeditionResult {
    const wiped = outcome === "wiped";
    if (wiped) {
      this.emit("wipe", "Nobody is left standing. The party lies where it fell.");
    }
    return {
      outcome,
      orders: this.orders,
      deepestFloor: this.deepest,
      days: Math.max(1, this.deepest),
      roomsVisited: this.roomsVisited,
      party: this.party,
      haul: wiped ? [] : this.haul,
      leftBehind: wiped ? this.haul : [],
      kills: this.kills,
      floorKills: this.floorKills,
      log: this.log,
      wipeSite: wiped ? { floor: this.depth, room: this.roomNo } : undefined,
    };
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
    this.log.push({ kind, text, floor: this.depth, room: this.roomNo, party, ...extra });
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
    return rollEncounter(this.ix, this.depth, this.rng, { level: f.level, max: f.population });
  }

  private fight(monsters: readonly string[], opts: { surprise?: boolean } = {}): Side | "none" {
    const result = runCombat(this.ix, this.party, monsters, {
      seed: this.rng.int(0, 2 ** 31 - 1),
      surprise: opts.surprise,
    });
    const summoned = new Set(result.log.filter((e) => e.kind === "summon").map((e) => e.target));
    const foes = result.fighters.filter((f) => f.side === "monsters" && !summoned.has(f.uid));
    const heroes = list(this.conscious().map((h) => h.name));
    this.emit("fight", `${heroes} face ${list(foes.map((f) => f.name))}.`, {
      monsters: foes.map((f) => {
        const max = f.derived.maxHp;
        return { uid: f.uid, name: f.name, hp: max, max };
      }),
    });
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
    }
    return result.winner;
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

  /** Free carry slots: everyone standing carries, downed heroes are carried. */
  private capacity(): number {
    let slots = 0;
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
      this.emit("loot", `Found ${an(def.name)} ${from} (worth about ${item.estimate}).`);
      if (this.orders.loot === "valuable" && worthPerSlot(this.ix, item) < VALUABLE_PER_SLOT) {
        const who = appraiser ? `${appraiser.hero.name} reckons it` : "It";
        this.emit("drop", `${who} isn't worth the space. Left behind.`);
        continue;
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
