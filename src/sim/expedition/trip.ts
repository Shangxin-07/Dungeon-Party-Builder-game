/**
 * A trip's state: the party, the haul, where they are, and the log. The
 * other layers build on this: care.ts (between rooms: first aid and packs),
 * fights.ts (rooms and fights), rescue.ts (lost parties and porters) and
 * run.ts (the trip from start to finish).
 */
import type { FloorPressure } from "../dungeon";
import { type Body } from "../fallen";
import { heroSheet, type Hero } from "../hero";
import type { Index } from "../library";
import { type HaulItem } from "../loot";
import { createRng, type Rng } from "../rng";
import { type StandingOrders } from "./orders";
import type { ExpeditionEventKind, HeroStatus, ExpeditionEvent, ExpeditionExtras } from "./report";

export const an = (name: string) => (/^[aeiou]/i.test(name) ? `an ${name}` : `a ${name}`);

export const list = (items: string[]) =>
  items.length > 1 ? `${items.slice(0, -1).join(", ")} and ${items.at(-1)}` : (items[0] ?? "");

/** The trip's state and the party. Extended by TripCare, TripFights, TripRescue, then Expedition. */
export class TripBase {
  protected party: Hero[];
  protected haul: HaulItem[] = [];
  protected kills: string[] = [];
  protected floorKills: Record<number, number> = {};
  protected log: ExpeditionEvent[] = [];
  protected depth = 0;
  protected roomNo = 0;
  protected deepest = 0;
  /** The first floor the party walks; the cage carries them past the ones above. */
  protected first = 1;
  protected roomsVisited = 0;
  protected wiped = false;
  /** Downed heroes we've already said are being carried, so the log doesn't repeat it. */
  protected carried = new Set<string>();
  protected orders: StandingOrders;
  protected seen = new Set<string>();
  /** Freed trapped heroes walking out with the party. They don't fight. */
  protected followers: Hero[] = [];
  protected siteVisited?: string;
  protected siteLeft: HaulItem[] = [];
  protected gearTaken: string[] = [];
  protected bodies: Body[] = [];
  protected risenMet: string[] = [];
  protected risenSlain: string[] = [];
  protected disobeyed = 0;
  protected secretRng: Rng;
  /** "Clear the floor" orders: the target floor's population on arrival, and rooms hunted. */
  protected huntStart = 0;
  protected hunts = 0;
  protected secrets = { found: 0, missed: 0 };
  /** True while rolling a hidden cache's loot, so its items are marked. */
  protected searching = false;
  /** Hero id → floor they last refused to turn back on (once per floor each). */
  protected refused = new Map<string, number>();

  constructor(
    protected ix: Index,
    party: readonly Hero[],
    orders: StandingOrders,
    protected rng: Rng,
    protected floors?: readonly FloorPressure[],
    protected extras: ExpeditionExtras = {},
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

  // -------------------------------------------------------------------------
  // The party
  // -------------------------------------------------------------------------

  protected conscious = () => this.party.filter((h) => h.condition === "ok");
  protected alive = () => this.party.filter((h) => h.condition !== "dead");
  protected maxHp = (h: Hero) => heroSheet(this.ix, h).derived.maxHp;
  protected maxMana = (h: Hero) => heroSheet(this.ix, h).derived.mana;

  protected best(skill: string): { hero: Hero; value: number } | undefined {
    let best: { hero: Hero; value: number } | undefined;
    for (const hero of this.conscious()) {
      const value = heroSheet(this.ix, hero).skills[skill] ?? 0;
      if (!best || value > best.value) best = { hero, value };
    }
    return best;
  }

  protected snapshot(): HeroStatus[] {
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

  protected emit(
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
}
