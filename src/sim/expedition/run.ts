/**
 * Running a trip: down, room by room, look after the party between rooms,
 * check orders, come home. Tuning numbers are in tuning.ts.
 */
import { theName } from "../research";
import type { FloorPressure } from "../dungeon";
import { heroSheet, type Hero } from "../hero";
import type { Index } from "../library";
import { type HaulItem } from "../loot";
import { createRng, type Rng } from "../rng";
import { getRoom } from "../rooms";
import {
  DEFAULT_ORDERS,
  type StandingOrders,
  coreOrder,
  describeRetreat,
  lairOf,
  sealOf,
  stoneOrder,
} from "./orders";
import { lairsOn, partyStealth, sneakChance } from "../stealth";
import type { FloorIntel } from "./report";
import type { ExpeditionResult, ExpeditionExtras } from "./report";
import { PARTY_HURT_BELOW, WANDER_CHANCE } from "./tuning";
import { list } from "./trip";
import { startFloor, tripDays } from "./clock";
import { TripRescue } from "./rescue";
import { shardPlace, stoneOf } from "../shards";
import { levelPower, rollEncounter } from "../encounter";

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

/**
 * A night for a party holed up on `floor` (M7.02): they rest and patch each
 * other up, and monsters may find them (a fight with nowhere to run).
 * `ready`: they're fit to try for home now.
 */
export function holedNight(
  ix: Index,
  heroes: readonly Hero[],
  floor: number,
  floors: readonly FloorPressure[] | undefined,
  seed: number,
): {
  party: Hero[];
  found: boolean;
  wiped: boolean;
  ready: boolean;
  floorKills: Record<number, number>;
} {
  const trip = new Expedition(
    ix,
    heroes,
    { ...DEFAULT_ORDERS, targetFloor: floor },
    createRng(seed),
    floors,
  );
  return trip.night(floor);
}

/**
 * A holed-up party tries for home on its own (M7.02), when its food runs out
 * or it's fit to walk again. Nothing makes it hole up a second time.
 */
export function breakOut(
  ix: Index,
  heroes: readonly Hero[],
  floor: number,
  floors: readonly FloorPressure[] | undefined,
  seed: number,
): ExpeditionResult {
  const trip = new Expedition(
    ix,
    heroes,
    { ...DEFAULT_ORDERS, targetFloor: floor },
    createRng(seed),
    floors,
  );
  return trip.walkOut(floor);
}

/** "a plank barricade", "an iron-bound gate". */
const aOrAn = (name: string) => `${/^[aeiou]/i.test(name) ? "an" : "a"} ${name.toLowerCase()}`;

/** One trip, from setting off to coming home (or not). */
export class Expedition extends TripRescue {
  /** The stairs the party sealed (M7.16). */
  protected sealed?: ExpeditionResult["sealed"];
  /** The Seal Stone the party set (M8.17). */
  protected stoneSet?: ExpeditionResult["stoneSet"];
  /** The party reached the Hearthstone's heart (M8.22). */
  protected coreVisit?: ExpeditionResult["core"];

  /** See holedNight. */
  night(floor: number) {
    this.depth = this.deepest = floor;
    const rules = this.ix.lib.rescue.holeUp;
    this.pass(24, true);
    this.firstAid();
    for (const h of this.alive()) {
      this.heal(h, Math.max(1, Math.round((this.maxHp(h) * rules.healPercent) / 100)));
      this.restoreMana(h, this.maxMana(h));
    }
    let found = false;
    if (this.rng.chance(rules.foundChance)) {
      const monsters = this.rollMonsters();
      if (monsters.length) {
        found = true;
        this.emit("fight", "Something has found the barricade. There's nowhere to run.");
        this.fight(monsters);
        if (!this.wiped) this.betweenRooms();
      }
    }
    return {
      party: this.party,
      found,
      wiped: this.wiped || !this.conscious().length,
      ready: !this.wiped && !this.cantGetHome(),
      floorKills: this.floorKills,
    };
  }

  /** See breakOut. */
  walkOut(floor: number): ExpeditionResult {
    this.depth = this.deepest = floor;
    this.noHolingUp = true;
    this.emit(
      "depart",
      `${list(this.alive().map((h) => h.name))} break out and make for the surface.`,
    );
    return this.goHome("retreated");
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
      : this.orders.rescue
        ? `floor ${targetFloor} to look for the missing`
        : this.scouting()
          ? `floor ${targetFloor} to scout ${targetFloor === 1 ? "it" : `the floors down to it`}`
          : this.lair()
            ? `${this.lair()!.name.replace(/^The /, "the ")} on floor ${this.lair()!.floor}${this.sneaking() ? ", as quietly as they can" : ", to kill what lives there"}`
            : `floor ${targetFloor}`;
    this.emit(
      "depart",
      `${names} set off for ${mission}. Orders: ${describeRetreat(retreat)}; ` +
        `${loot === "everything" ? "carry everything" : "leave the junk"}` +
        `${this.sealing() ? `; seal the stairs below floor ${targetFloor} with ${aOrAn(this.sealing()!.name)}` : ""}` +
        `${this.stone() ? `; set the ${this.ix.item(this.stone()!).name} on the stairs below floor ${targetFloor}` : ""}` +
        `${this.goingForCore() ? "; go down to the heart of the Hearthstone and shut it off" : ""}` +
        `${this.huntGoal() ? `; thin out floor ${targetFloor} by ${this.orders.clearPercent}%` : ""}.`,
    );

    // The Seal Stone goes down in the packs (M8.17): if the party never sets
    // it, it comes home again, or lies with them if they fall.
    const stone = this.stone();
    if (stone) {
      const def = this.ix.item(stone);
      this.haul.push({ item: stone, value: def.value, estimate: def.value, keep: true });
    }

    // The Mine Cage: ride past the top floors, and a forward camp's paths
    // (M8.20) lead on down to it; but never past the target floor, nor a
    // floor a rescue party has to search.
    const camp = this.extras.camp;
    const start = startFloor(targetFloor, this.extras.lift, camp, site?.floor ?? targetFloor);
    this.first = start.first;
    this.pathFloors = start.path;
    const time = this.ix.lib.time;
    if (start.cage) {
      this.emit(
        "depart",
        `The party rides the cage down past ${start.cage === 1 ? "floor 1" : `floors 1 to ${start.cage}`}.`,
      );
      this.pass(time.cagePerFloor * start.cage);
    }
    if (start.path && camp) {
      const from = start.cage + 1;
      const to = start.first - 1;
      this.emit(
        "depart",
        `The party takes the guild's paths down through ${from === to ? `floor ${to}` : `floors ${from} to ${to}`}.`,
      );
      this.pass(camp.path * start.path);
    }
    if (start.camp && camp) this.campRest(camp);

    for (let depth = this.first; depth <= targetFloor; depth++) {
      const floor = this.ix.floor(depth);
      const rooms = planFloor(this.ix, depth, this.rng);
      this.pass(time.stairs);
      this.depth = depth;
      if (depth === targetFloor) this.huntStart = this.floors?.[depth - 1]?.population ?? 0;
      this.deepest = depth;
      this.roomNo = 0;
      this.emit("floor", `Floor ${depth}: ${floor.name}.`);
      this.moments({ kind: "floor" });
      const notes = this.notes();
      if (notes) notes.of = rooms.length;

      for (let i = 0; i < rooms.length; i++) {
        const room = this.ix.room(rooms[i]!);
        this.campIfTired();
        this.roomNo = i + 1;
        this.roomsVisited++;
        this.emit("room", `${room.name}. ${this.rng.pick(room.descriptions)}`);
        getRoom(room.behaviour)(this.context(room.id));
        if (!this.wiped) this.moments({ kind: "room", room });
        this.noteRoom(room.id);
        // A rescue mission (M7.02) hurries through the rooms.
        const pace = this.onRescue() ? this.ix.lib.rescue.rescuePace : 1;
        this.pass(
          (room.hours ?? time.room) * pace + (time.behaviours[room.behaviour] ?? 0),
          !!room.rest && !this.wiped,
        );
        if (!this.wiped && !this.onRescue()) this.search();
        if (!this.wiped) this.betweenRooms();
        if (this.wiped) return this.finish("wiped");

        // The Library's leads (DESIGN.md §20): dug out on the way through the floor.
        if (i === 0 && !this.onRescue()) this.digLeads();

        const site = this.extras.site;
        if (site && !this.siteVisited && site.floor === depth) {
          if (i + 1 === Math.max(1, Math.min(site.room, rooms.length))) this.visitSite(site);
        }

        // A lair (M7.08) lies off the middle of its floor.
        const lair = this.lair();
        if (
          lair &&
          !this.lairVisit &&
          lair.floor === depth &&
          i + 1 === Math.ceil(rooms.length / 2)
        ) {
          this.visitLair();
          if (this.wiped) return this.finish("wiped");
          if (this.sneaking() && !this.fledFrom) {
            this.emit("retreat", "With what they came for, the party creeps back the way it came.");
            return this.goHome("returned");
          }
        }

        const lastRoom = depth === targetFloor && i === rooms.length - 1 && !this.huntGoal();
        const reason = lastRoom ? undefined : this.retreatReason();
        if (reason && this.fledFrom) {
          this.emit("retreat", `${reason}. The party heads for home.`);
          return this.goHome("retreated");
        }
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
          // Over command (M7.05): someone won't take the leader's word for it.
          const unruly = this.unruly();
          if (unruly) {
            this.disobeyed++;
            this.emit(
              "disobey",
              `${reason}, but ${unruly.name} won't take orders from ${this.leaderName()}. The party presses on.`,
            );
            continue;
          }
          this.emit("retreat", `${reason}. Following orders, the party turns back.`);
          return this.goHome("retreated");
        }
      }
    }
    this.setStone();
    if (this.wiped) return this.finish("wiped");
    this.reachCore();
    if (this.wiped) return this.finish("wiped");
    this.buildSeal();
    if (this.wiped) return this.finish("wiped");
    const hunted = this.hunt();
    if (hunted) return hunted;
    this.roomNo = 0;
    this.emit("retreat", `Floor ${targetFloor} is done. The party heads for home.`);
    return this.goHome("returned");
  }

  /** The Seal Stone the party carries down (M8.17), if it seals the target floor. */
  protected stone(): string | undefined {
    const id = stoneOrder(this.orders);
    const place = id ? stoneOf(this.ix, id) : undefined;
    return place && place.set.floor === this.orders.targetFloor ? id : undefined;
  }

  /**
   * Set the Seal Stone on the stairs below the target floor (M8.17, DESIGN.md
   * §20). The floor below notices: a surge comes up the stairs, and there's
   * no slipping away from it. Win, and the stairs are shut for good; lose,
   * or run, and the stone stays in the packs.
   */
  protected setStone(): void {
    const id = this.stone();
    const up = this.conscious();
    if (!id || !up.length) return;
    const { set } = stoneOf(this.ix, id)!;
    const floor = this.orders.targetFloor;
    const name = this.ix.item(id).name;
    this.campIfTired();
    this.roomNo = 0;
    this.emit(
      "seal",
      `At the head of the stairs down to floor ${floor + 1}, ${list(up.map((h) => h.name))} start setting the ${name}.`,
    );
    this.pass(this.ix.lib.sealing.hours);
    this.emit("seal", set.surge.text);
    // The surge comes from the floor below: its kills come off that floor.
    const below = this.floors?.[floor];
    const level = below?.level ?? floor + 1;
    this.depth = floor + 1;
    const monsters =
      below && below.population <= 0
        ? []
        : rollEncounter(this.ix, floor + 1, this.rng, {
            level,
            power: levelPower(level) * set.surge.power,
            scale: this.fightScale(),
            ...(below ? { max: below.population } : {}),
          });
    const winner = monsters.length ? this.fight(monsters, { cornered: true }) : "party";
    this.depth = floor;
    if (this.wiped) return;
    if (winner !== "party" || this.fledFrom) {
      this.emit("seal", `The party can't hold the stairs. The ${name} goes back in the packs.`);
      this.betweenRooms();
      return;
    }
    const at = this.haul.findIndex((h) => h.item === id);
    if (at >= 0) this.haul.splice(at, 1);
    this.stoneSet = { floor, stone: id, day: this.tripDay() };
    this.emit(
      "seal",
      `The ${name} is set. The stairs below floor ${floor} are shut, and nothing will come up them again.`,
    );
    this.betweenRooms();
  }

  /** Is the party going for the Hearthstone's heart (M8.22), on its floor? */
  protected goingForCore(): boolean {
    return coreOrder(this.orders) && this.orders.targetFloor === this.ix.lib.core.floor;
  }

  /**
   * Down to the Hearthstone's heart (M8.22, DESIGN.md §20), once its floor is
   * walked. The Foreman's Shade shows the way; the heart's guardian rises
   * with the floor's crew round it, and there's no slipping away. Win, and
   * the party shuts the heart off for good.
   */
  protected reachCore(): void {
    const up = this.conscious();
    if (!this.goingForCore() || !up.length) return;
    const core = this.ix.lib.core;
    const floor = core.floor;
    this.campIfTired();
    this.roomNo++;
    this.roomsVisited++;
    this.pass(core.walkHours);
    this.emit("core", core.text.reach);
    this.coreVisit = { day: this.tripDay(), shut: false };
    this.emit("core", core.text.guardian);
    const here = this.floors?.[floor - 1];
    const level = here?.level ?? floor;
    const crew =
      core.escort <= 0 || (here && here.population <= 0)
        ? []
        : rollEncounter(this.ix, floor, this.rng, {
            level,
            power: levelPower(level) * core.escort,
            scale: this.fightScale(),
            ...(here ? { max: here.population } : {}),
          });
    const winner = this.fight([core.guardian, ...crew], { cornered: true });
    if (this.wiped) return;
    if (winner !== "party" || this.fledFrom) {
      this.emit("core", core.text.beaten);
      this.betweenRooms();
      return;
    }
    this.betweenRooms();
    this.pass(core.shutHours);
    this.coreVisit = { day: this.tripDay(), shut: true };
    this.emit("core", core.text.shut);
  }

  /** The barricade the party carries down to seal the stairs with (M7.16), if it can. */
  protected sealing() {
    const id = sealOf(this.orders);
    if (!id || this.orders.targetFloor >= this.bottom()) return undefined;
    return this.ix.barricade(id);
  }

  /**
   * Seal the stairs below the target floor (M7.16, DESIGN.md §18.3b): the
   * party spends the barricade's hours building at the stairhead, and
   * something may come up the stairs while it works.
   */
  protected buildSeal(): void {
    const b = this.sealing();
    const up = this.conscious();
    if (!b || !up.length) return;
    const floor = this.orders.targetFloor;
    this.campIfTired();
    this.roomNo = 0;
    this.emit(
      "seal",
      `At the head of the stairs down to floor ${floor + 1}, ${list(up.map((h) => h.name))} set to work on ${aOrAn(b.name)}.`,
    );
    this.pass(b.hours);
    if (this.rng.chance(WANDER_CHANCE)) {
      const monsters = this.rollMonsters();
      if (monsters.length) {
        this.emit("fight", "Something comes up the stairs to see what the hammering is.");
        this.fight(monsters);
        if (this.wiped) return;
        this.betweenRooms();
      }
    }
    this.sealed = { floor, barricade: b.id, day: this.tripDay() };
    this.emit(
      "seal",
      `The stairs below floor ${floor} are sealed. Nothing is coming up that way for a while.`,
    );
  }

  /** The lair the orders send the party to (M7.08). */
  protected lair() {
    const id = lairOf(this.orders);
    return id ? this.ix.lair(id) : undefined;
  }

  /**
   * Into a huge beast's lair (M7.08, DESIGN.md §17.8). A sneak party creeps
   * in for what it came for, if the beast doesn't hear it; a delve party, or
   * a sneak party that's heard, faces the beast with nowhere to slip off to.
   * Something nothing can hurt sends the party running (the ward, M7.07).
   */
  protected visitLair(): void {
    const lair = this.lair()!;
    this.roomNo++;
    this.roomsVisited++;
    this.emit("room", `${lair.name}. ${lair.description}`);
    this.pass(this.ix.lib.time.room);
    const beast = this.ix.monster(lair.monster);
    if (this.extras.slainLairs?.includes(lair.id)) {
      this.emit("quiet", `The ${beast.name} is dead. Only the black water moves.`);
      this.lairVisit = { id: lair.id, outcome: "empty" };
      return;
    }
    this.seen.add(lair.monster);
    if (this.sneaking()) {
      const up = this.conscious();
      const quiet = partyStealth(this.ix, up);
      if (up.length && this.rng.chance(sneakChance(this.ix, quiet.value, [lair.monster]))) {
        this.sneaked.past++;
        const who = [...up].sort(
          (a, b) =>
            (heroSheet(this.ix, b).skills.stealth ?? 0) -
            (heroSheet(this.ix, a).skills.stealth ?? 0),
        )[0]!;
        this.emit("scout", `${who.name} ${lair.fetched}. The ${beast.name} never stirs.`);
        this.findLoot(lair.fetch, "the wallow", true);
        this.lairVisit = { id: lair.id, outcome: "fetched" };
        return;
      }
      this.sneaked.heard++;
      this.emit("fight", `The ${beast.name} heaves itself out of the water. It heard them.`);
    }
    const before = this.kills.length;
    this.fight([lair.monster], { cornered: true });
    const slain = this.kills.slice(before).includes(lair.monster);
    if (slain && !this.wiped) {
      this.emit("loot", `The ${beast.name} is dead. The party wades in after what it swallowed.`);
      this.findLoot(lair.hoard, "the wallow", true);
    }
    this.lairVisit = {
      id: lair.id,
      outcome: slain ? "slain" : this.fledFrom ? "fled" : "fought",
    };
    if (!this.wiped) this.betweenRooms();
  }

  /** A scout writes up a room they walked (M7.08): a feature, a hazard, or nothing much. */
  protected noteRoom(id: string): void {
    const n = this.notes();
    if (!n) return;
    n.rooms++;
    // Halfway along a floor, scouts find any lair off it (M7.08), and glimpse its beast.
    if (!n.lairs && n.of && n.rooms >= Math.ceil(n.of / 2)) {
      n.lairs = [];
      for (const lair of lairsOn(this.ix, n.floor)) {
        n.lairs.push(lair.id);
        this.seen.add(lair.monster);
        const scout = this.best("scouting");
        this.emit("scout", `${scout ? scout.hero.name : "The party"} ${lair.found}.`);
      }
    }
    const room = this.ix.room(id);
    const kind =
      room.intel ??
      (room.trap ? "hazard" : ["fight", "quiet"].includes(room.behaviour) ? "plain" : "feature");
    if (kind === "feature" && !n.features.includes(id)) n.features.push(id);
    if (kind === "hazard" && !n.hazards.includes(id)) n.hazards.push(id);
  }

  /** The scouts' notes as they bring them home (M7.08): numbers as the floors stand now. */
  protected intelNow(): FloorIntel[] {
    const round = Math.max(1, this.ix.lib.scouting.roundTo);
    return [...this.intel.values()].map((n) => {
      const f = this.floors?.[n.floor - 1];
      const pop = f?.population ?? 0;
      return {
        ...n,
        monsters: { ...n.monsters },
        features: [...n.features],
        hazards: [...n.hazards],
        ...(n.lairs ? { lairs: [...n.lairs] } : {}),
        level: f?.level ?? n.level,
        population: pop > 0 ? Math.max(1, Math.round(pop / round) * round) : 0,
      };
    });
  }

  /** Kills on the target floor a "clear the floor" order asks for (0: no such order). */
  protected huntGoal(): number {
    const pct = this.orders.clearPercent ?? 0;
    // Scouts and sneak parties (M7.08) never hunt.
    if (pct <= 0 || this.orders.rescue || this.scouting() || this.sneaking() || !this.floors)
      return 0;
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
  protected hunt(): ExpeditionResult | undefined {
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
      // Over command (M7.05): someone has had enough of hunting and the rest follow.
      const unruly = this.unruly();
      if (unruly) {
        this.disobeyed++;
        this.emit(
          "disobey",
          `${unruly.name} has had enough of hunting and won't listen to ${this.leaderName()}. The party heads for home.`,
        );
        break;
      }
      this.campIfTired();
      this.hunts++;
      this.roomNo = ++rooms;
      this.roomsVisited++;
      this.emit(
        "room",
        `Hunting: ${killed()} of ${goal} killed. The party searches the side tunnels.`,
      );
      this.pass(this.ix.lib.time.hunt);
      this.inHunt = true;
      if (lair) getRoom(lair.behaviour)(this.context(lair.id));
      else {
        const monsters = this.rollMonsters();
        if (monsters.length) this.fight(monsters);
      }
      this.inHunt = false;
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

  /** A night at the forward camp on the way down (M8.20): sleep, and the sickbay's care. */
  protected campRest(camp: { floor: number; rest: number }): void {
    this.depth = camp.floor;
    this.emit(
      "rest",
      `The party spends the night at the guild's forward camp on floor ${camp.floor}.`,
    );
    for (const h of this.alive()) {
      const hp = this.heal(h, Math.round((this.maxHp(h) * camp.rest) / 100));
      const mana = this.restoreMana(h, Math.round((this.maxMana(h) * camp.rest) / 100));
      const parts = [hp ? `+${hp} HP` : "", mana ? `+${mana} mana` : ""].filter(Boolean);
      if (parts.length) this.emit("rest", `${h.name}: ${parts.join(", ")}.`);
    }
    this.pass(this.ix.lib.time.campHours, true);
  }

  /** Climb back up. Cleared floors are quieter, but something may have wandered in. */
  protected goHome(outcome: "returned" | "retreated"): ExpeditionResult {
    this.roomNo = 0;
    const time = this.ix.lib.time;
    for (let d = this.depth; d >= this.first; d--) {
      this.depth = d;
      if (this.cantGetHome()) return this.holeUp();
      this.campIfTired();
      this.pass(time.climbPerFloor);
      if (!this.rng.chance(WANDER_CHANCE)) continue;
      const monsters = this.rollMonsters();
      if (!monsters.length) continue;
      this.emit("wander", `On the way up through floor ${d}, something blocks the tunnel.`);
      this.fight(monsters);
      if (!this.wiped) this.betweenRooms();
      if (this.wiped) return this.finish("wiped");
    }
    this.depth = 0;
    if (this.pathFloors && this.extras.camp) {
      this.pass(this.extras.camp.path * this.pathFloors);
      this.emit("home", `They take the guild's paths up past the forward camp.`);
    }
    const cage = this.first - 1 - this.pathFloors;
    if (cage > 0) {
      this.pass(time.cagePerFloor * cage);
      this.emit(
        "home",
        `The cage hauls them up the last ${cage === 1 ? "floor" : `${cage} floors`}.`,
      );
    }
    const back = list([...this.alive(), ...this.followers].map((h) => h.name));
    this.emit("home", `${back} climb out of the pit.`);
    return this.finish(outcome);
  }

  /**
   * Holing up (M7.02, DESIGN.md §17.3): on the way home, a party that can't
   * carry its downed, or is too weak to fight its way up with nothing left to
   * heal, barricades itself in where it is and waits for help instead of
   * fighting to the end. From floor holeUp.minFloor down only.
   */
  protected cantGetHome(): boolean {
    const rules = this.ix.lib.rescue.holeUp;
    if (this.noHolingUp || this.depth < rules.minFloor) return false;
    const up = this.conscious();
    if (!up.length) return false;
    const downed = this.party.filter((h) => h.condition === "downed").length;
    if (downed > up.length) return true;
    const weak = up.every((h) => h.hp < (this.maxHp(h) * rules.weakBelow) / 100);
    const heal = (id: string) => this.ix.item(id).tags.includes("heal");
    return weak && !this.alive().some((h) => h.pack.some(heal));
  }

  protected holeUp(): ExpeditionResult {
    const rules = this.ix.lib.rescue.holeUp;
    const medic = this.best("medicine")?.value ?? 0;
    const supplies = Math.min(
      rules.maxDays,
      rules.baseDays + Math.floor(medic / rules.medicinePerDay),
    );
    const downed = this.party.filter((h) => h.condition === "downed").map((h) => h.name);
    const why = downed.length
      ? `They can't carry ${list(downed)} all the way up. The party`
      : "Too weak to fight their way out, the party";
    this.emit(
      "holed",
      `${why} barricades itself in a cleared room on floor ${this.depth} and waits for help. ` +
        `The food will last about ${supplies} days.`,
    );
    this.holed = { floor: this.depth, room: this.roomNo, supplies };
    return this.finish("holed");
  }

  protected finish(outcome: ExpeditionResult["outcome"]): ExpeditionResult {
    const wiped = outcome === "wiped";
    const holed = outcome === "holed";
    let porterHaul: HaulItem[] = [];
    const porters: ExpeditionResult["porters"] = [];
    if (wiped) {
      this.emit("wipe", "Nobody is left standing. The party lies where it fell.");
      porterHaul = this.portersRun(porters);
    } else if (holed) {
      // Porters stay with the party: there's no sending anyone up.
      for (const p of this.extras.porters ?? [])
        porters.push({ id: p.id, name: p.name, home: false });
    } else {
      for (const p of this.extras.porters ?? [])
        porters.push({ id: p.id, name: p.name, home: true });
    }
    return {
      outcome,
      orders: this.orders,
      deepestFloor: this.deepest,
      days: tripDays(this.ix.lib.time.startHour, this.hours),
      hours: this.hours,
      roomsVisited: this.roomsVisited,
      party: this.party,
      haul: wiped || holed ? [] : this.haul,
      leftBehind: wiped || holed ? this.haul.filter((h) => !porterHaul.includes(h)) : [],
      porterHaul,
      porters,
      kills: this.kills,
      floorKills: this.floorKills,
      dayKills: this.dayKills,
      holed: this.holed,
      log: this.log,
      wipeSite: wiped ? { floor: this.depth, room: this.roomNo } : undefined,
      seen: [...this.seen],
      rescued: this.followers,
      siteVisited: this.siteVisited,
      siteLeft: this.siteLeft,
      siteBodiesLeft: this.siteBodiesLeft || undefined,
      gearTaken: this.gearTaken,
      bodies: this.bodies,
      risenMet: this.risenMet,
      risenSlain: this.risenSlain,
      disobeyed: this.disobeyed,
      deserters: this.deserters,
      bigWins: this.bigWins,
      leaderFell: this.leaderFell || undefined,
      secrets: this.secrets,
      huntRooms: this.hunts,
      deeds: this.deeds,
      gifts: wiped || holed ? [] : this.gifts,
      parleys: this.parleys,
      moments: wiped || holed ? [] : this.momentsHad,
      ...(this.scouting() ? { intel: wiped ? [] : this.intelNow(), slipped: this.slipped } : {}),
      ...(this.sneaking() ? { sneaked: this.sneaked } : {}),
      ...(this.lairVisit ? { lair: this.lairVisit } : {}),
      ...(this.sealed ? { sealed: this.sealed } : {}),
      ...(this.stoneSet ? { stoneSet: this.stoneSet } : {}),
      ...(this.coreVisit ? { core: this.coreVisit } : {}),
      ...(this.shardsFound.length ? { shards: [...this.shardsFound] } : {}),
    };
  }

  /**
   * A shard the Library has worked out the place of (DESIGN.md §20): the
   * first party through its floor digs it out.
   */
  protected digLeads(): void {
    for (const id of this.extras.shards ?? []) {
      if (this.shardsFound.includes(id)) continue;
      const { source } = shardPlace(this.ix, id);
      if (source.kind !== "library" || source.floor !== this.depth) continue;
      const who = this.best("scouting")?.hero ?? this.conscious()[0];
      if (!who) return;
      this.emit("shard", `${who.name} ${source.dug}.`);
      this.pass(this.ix.lib.time.cache);
      this.takeShard(id);
    }
  }

  /**
   * A shard hidden like a cache (DESIGN.md §20): `chance` each room that the
   * party passes it, then the best scout has to spot it, as with secrets.
   */
  protected shardCaches(): void {
    const rules = this.ix.lib.searching;
    for (const id of this.extras.shards ?? []) {
      if (this.shardsFound.includes(id)) continue;
      const { source } = shardPlace(this.ix, id);
      if (source.kind !== "cache" || source.floor !== this.depth) continue;
      if (!this.shardRng.chance(source.chance)) continue;
      const scout = this.best("scouting");
      const chance = Math.min(
        rules.maxChance,
        Math.max(0, ((scout?.value ?? 0) - source.hidden) / rules.spread),
      );
      if (!scout || !this.shardRng.chance(chance)) continue;
      this.emit("shard", `${scout.hero.name} notices ${source.spotted}.`);
      this.pass(this.ix.lib.time.cache);
      this.takeShard(id);
    }
  }

  /**
   * Hidden treasure (M6, content/secrets/): some rooms hide a cache that only
   * the party's best Scouting can find. Missed caches are counted but never
   * logged: the party doesn't know what it walked past.
   */
  protected search(): void {
    this.shardCaches();
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
    this.pass(this.ix.lib.time.cache);
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
  // Morale in the dungeon
  // -------------------------------------------------------------------------

  /**
   * A low-morale hero whose motivation makes them refuse to turn back
   * (DESIGN.md §6), if one does this time. Each can refuse once per floor.
   */
  protected refuser(): Hero | undefined {
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

  // -------------------------------------------------------------------------
  // Standing orders
  // -------------------------------------------------------------------------

  /**
   * An unruly hero (M7.05) who ignores the leader at this order check, if one
   * does: each at most once a floor.
   */
  protected unruly(): Hero | undefined {
    const lead = this.extras.leader;
    if (!lead) return undefined;
    for (const h of this.conscious()) {
      const chance = lead.disobey[h.id] ?? 0;
      if (chance <= 0 || h.id === lead.id || this.refused.get(h.id) === this.depth) continue;
      if (this.rng.chance(chance)) {
        this.refused.set(h.id, this.depth);
        return h;
      }
    }
    return undefined;
  }

  protected leaderName(): string {
    const id = this.extras.leader?.id;
    return this.party.find((h) => h.id === id)?.name ?? "the leader";
  }

  /**
   * The whole party's state, for the "badly hurt" order (M7.06, DESIGN.md
   * §17.6): one hero down or dead doesn't send everyone home while the rest
   * are fine. Turn back once half the party is down or dead, or the party's
   * HP (the downed count as nothing) is below half.
   */
  protected partyInTrouble(): string | undefined {
    const fallen = this.party.filter((h) => h.condition !== "ok");
    if (!fallen.length) return undefined;
    if (fallen.length * 2 >= this.party.length)
      return `${fallen.map((h) => h.name).join(" and ")} ${fallen.length === 1 ? "is" : "are"} down`;
    const living = this.alive();
    const hp = living.reduce((s, h) => s + (h.condition === "ok" ? h.hp : 0), 0);
    const max = living.reduce((s, h) => s + this.maxHp(h), 0);
    if (hp * 100 < max * PARTY_HURT_BELOW) return "The party is badly hurt";
    return undefined;
  }

  protected retreatReason(): string | undefined {
    // Ran from something nothing could hurt (M7.07): nobody argues with that.
    if (this.fledFrom) return `Nothing the party has can hurt ${theName(this.fledFrom)}`;
    // The leader just went down (M7.05): the party may lose heart, whatever the orders.
    if (this.leaderShaken) {
      this.leaderShaken = false;
      const up = this.conscious();
      const morale = up.reduce((s, h) => s + h.morale, 0) / Math.max(1, up.length);
      const chance = Math.min(0.9, this.ix.lib.leadership.leaderFalls * (1 + (50 - morale) / 50));
      if (up.length && this.rng.chance(chance))
        return `With ${this.leaderName()} fallen, the party loses heart`;
    }
    const rule = this.orders.retreat;
    const fallen = this.party.find((h) => h.condition !== "ok");
    const why = fallen && `${fallen.name} ${fallen.condition === "dead" ? "is dead" : "is down"}`;
    switch (rule.kind) {
      case "never":
        return undefined;
      case "hero-downed":
        return why;
      case "hero-hp-below": {
        // The whole party's state (M7.06), not just whoever went down.
        const trouble = this.partyInTrouble();
        if (trouble) return trouble;
        const percent = rule.percent + (this.extras.leader?.retreatEarly ?? 0);
        const hurt = this.conscious().find((h) => h.hp < (this.maxHp(h) * percent) / 100);
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
