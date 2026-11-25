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
import { isScouting, isSneaking, type StandingOrders } from "./orders";
import type {
  Deserter,
  ExpeditionEventKind,
  HeroStatus,
  ExpeditionEvent,
  ExpeditionExtras,
  ExpeditionResult,
  FloorIntel,
} from "./report";

export const an = (name: string) => (/^[aeiou]/i.test(name) ? `an ${name}` : `a ${name}`);

export const list = (items: string[]) =>
  items.length > 1 ? `${items.slice(0, -1).join(", ")} and ${items.at(-1)}` : (items[0] ?? "");

/** The trip's state and the party. Extended by TripCare, TripFights, TripRescue, then Expedition. */
export class TripBase {
  protected party: Hero[];
  protected haul: HaulItem[] = [];
  protected kills: string[] = [];
  protected floorKills: Record<number, number> = {};
  /** Kills by day of the trip, then floor (M7.02): they come off the dungeon night by night. */
  protected dayKills: Record<number, Record<number, number>> = {};
  /** Set on a party breaking out after holing up: it won't hole up again. */
  protected noHolingUp = false;
  /** Where the party holed up, if it couldn't get home (M7.02). */
  protected holed?: { floor: number; room: number; supplies: number };
  protected log: ExpeditionEvent[] = [];
  protected depth = 0;
  protected roomNo = 0;
  protected deepest = 0;
  /** The first floor the party walks; the cage carries them past the ones above. */
  protected first = 1;
  /** Floors passed on the guild's paths to a forward camp, each way (M8.20). */
  protected pathFloors = 0;
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
  /** A rescue mission left the site's dead where they lie (M7.02). */
  protected siteBodiesLeft = false;
  protected gearTaken: string[] = [];
  protected bodies: Body[] = [];
  protected risenMet: string[] = [];
  protected risenSlain: string[] = [];
  protected disobeyed = 0;
  protected secretRng: Rng;
  /**
   * The Hearthstone's shards (DESIGN.md §20) roll on their own stream too, so
   * a trip with none left to find plays out exactly as it did before them.
   */
  protected shardRng: Rng;
  /** Shard sources found this trip, and the bearer leading the group just rolled. */
  protected shardsFound: string[] = [];
  protected bearerOut?: string;
  /** Out hunting the side tunnels (a clear-the-floor order), where shard-bearers keep. */
  protected inHunt = false;
  /** "Clear the floor" orders: the target floor's population on arrival, and rooms hunted. */
  protected huntStart = 0;
  protected hunts = 0;
  protected secrets = { found: 0, missed: 0 };
  /** True while rolling a hidden cache's loot, so its items are marked. */
  protected searching = false;
  /** Hero id → floor they last refused to turn back on (once per floor each). */
  protected refused = new Map<string, number>();
  /** Alignment in the dungeon (DESIGN.md §7): deeds done, gifts earned, fights talked out of. */
  protected deeds = { goodDeeds: 0, evilDeeds: 0 };
  protected gifts: { gold: number; news: string }[] = [];
  protected parleys = 0;
  /** The trip clock (M7.01): hours since setting off, and hours since the party last slept. */
  protected hours = 0;
  protected awake = 0;
  /** Leaders (M7.05): heroes who slipped away, big fights won, and the leader going down. */
  protected deserters: Deserter[] = [];
  protected bigWins = 0;
  protected leaderFell = false;
  /** The leader just went down: the next order check, the party may lose heart. */
  protected leaderShaken = false;
  /** The party just ran from something it couldn't hurt (M7.07): it heads home. */
  protected fledFrom?: string;
  /** Fighters who set off (M7.05): monster groups grow with them. */
  protected fighters = 0;
  /** A scout mission's notes, by floor (M7.08). */
  protected intel = new Map<number, FloorIntel>();
  /** Fights a scout party slipped past (M7.08). */
  protected slipped = 0;
  /** A sneak party's fights got past unheard, and heard (M7.08). */
  protected sneaked = { past: 0, heard: 0 };
  /** The lair the party went into, and how it went (M7.08). */
  protected lairVisit?: ExpeditionResult["lair"];

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
    this.shardRng = createRng((seed ^ 0x54a2d5) >>> 0);
    this.floors = floors?.map((f) => ({ ...f }));
    this.party = party.map((h) => ({
      ...h,
      stats: { ...h.stats },
      perks: [...h.perks],
      equipment: { ...h.equipment },
      pack: [...h.pack],
    }));
    this.fighters = this.party.filter((h) => h.condition === "ok").length;
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
    return this.party.map((h) => {
      const { derived } = heroSheet(this.ix, h);
      return {
        uid: h.id,
        name: h.name,
        hp: h.hp,
        maxHp: derived.maxHp,
        mana: h.mana,
        maxMana: derived.mana,
        condition: h.condition,
      };
    });
  }

  // -------------------------------------------------------------------------
  // The clock (M7.01, content/time.ts)
  // -------------------------------------------------------------------------

  /** Time passes. `sleep`: the party slept through it. */
  protected pass(hours: number, sleep = false): void {
    if (!(hours > 0)) return;
    this.hours = Math.round((this.hours + hours) * 100) / 100;
    this.awake = sleep ? 0 : this.awake + hours;
  }

  /** The day of the trip it is now: 0 is the day the party set off. */
  protected tripDay(): number {
    return Math.floor((this.ix.lib.time.startHour + this.hours) / 24);
  }

  /** On a search for the living (M7.02), travelling light and fast. */
  protected onRescue(): boolean {
    return !!this.orders.rescue && this.orders.mission === "rescue";
  }

  /** On a scout mission (M7.08). */
  protected scouting(): boolean {
    return isScouting(this.orders);
  }

  /** On a sneak mission (M7.08). */
  protected sneaking(): boolean {
    return isSneaking(this.orders);
  }

  /** A scout's notes on the floor they're on (M7.08). */
  protected notes(): FloorIntel | undefined {
    if (!this.scouting() || this.depth < 1) return undefined;
    let n = this.intel.get(this.depth);
    if (!n) {
      n = {
        floor: this.depth,
        hour: this.hours,
        level: this.floors?.[this.depth - 1]?.level ?? this.depth,
        population: 0,
        monsters: {},
        groups: 0,
        slipped: 0,
        features: [],
        hazards: [],
        rooms: 0,
        of: 0,
      };
      this.intel.set(this.depth, n);
    }
    n.hour = this.hours;
    return n;
  }

  /** Make camp if the party has been awake too long. */
  protected campIfTired(): void {
    const t = this.ix.lib.time;
    if (this.awake < t.awakeHours || this.wiped || !this.conscious().length) return;
    this.emit("camp", "Worn out, the party makes camp in a side tunnel and takes turns on watch.");
    this.pass(t.campHours, true);
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
      hour: this.hours,
      party,
      ...extra,
    });
  }
}
