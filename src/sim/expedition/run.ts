/**
 * Running a trip: down, room by room, look after the party between rooms,
 * check orders, come home. Tuning numbers are in tuning.ts.
 */
import type { FloorPressure } from "../dungeon";
import { type Hero } from "../hero";
import type { Index } from "../library";
import { type HaulItem } from "../loot";
import { createRng, type Rng } from "../rng";
import { getRoom } from "../rooms";
import { DEFAULT_ORDERS, type StandingOrders, describeRetreat } from "./orders";
import type { ExpeditionResult, ExpeditionExtras } from "./report";
import { WANDER_CHANCE } from "./tuning";
import { list } from "./trip";
import { tripDays } from "./clock";
import { TripRescue } from "./rescue";

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

/** One trip, from setting off to coming home (or not). */
export class Expedition extends TripRescue {
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
    const time = this.ix.lib.time;
    if (this.first > 1) {
      this.emit(
        "depart",
        `The party rides the cage down past ${this.first === 2 ? "floor 1" : `floors 1 to ${this.first - 1}`}.`,
      );
      this.pass(time.cagePerFloor * (this.first - 1));
    }

    for (let depth = this.first; depth <= targetFloor; depth++) {
      const floor = this.ix.floor(depth);
      const rooms = planFloor(this.ix, depth, this.rng);
      this.pass(time.stairs);
      this.depth = depth;
      if (depth === targetFloor) this.huntStart = this.floors?.[depth - 1]?.population ?? 0;
      this.deepest = depth;
      this.roomNo = 0;
      this.emit("floor", `Floor ${depth}: ${floor.name}.`);

      for (let i = 0; i < rooms.length; i++) {
        const room = this.ix.room(rooms[i]!);
        this.campIfTired();
        this.roomNo = i + 1;
        this.roomsVisited++;
        this.emit("room", `${room.name}. ${this.rng.pick(room.descriptions)}`);
        getRoom(room.behaviour)(this.context(room.id));
        // A rescue mission (M7.02) hurries through the rooms.
        const pace = this.onRescue() ? this.ix.lib.rescue.rescuePace : 1;
        this.pass(
          (room.hours ?? time.room) * pace + (time.behaviours[room.behaviour] ?? 0),
          !!room.rest && !this.wiped,
        );
        if (!this.wiped && !this.onRescue()) this.search();
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
    const hunted = this.hunt();
    if (hunted) return hunted;
    this.roomNo = 0;
    this.emit("retreat", `Floor ${targetFloor} is done. The party heads for home.`);
    return this.goHome("returned");
  }

  /** Kills on the target floor a "clear the floor" order asks for (0: no such order). */
  protected huntGoal(): number {
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
    if (this.first > 1) {
      this.pass(time.cagePerFloor * (this.first - 1));
      this.emit(
        "home",
        `The cage hauls them up the last ${this.first - 1 === 1 ? "floor" : `${this.first - 1} floors`}.`,
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
    };
  }

  /**
   * Hidden treasure (M6, content/secrets/): some rooms hide a cache that only
   * the party's best Scouting can find. Missed caches are counted but never
   * logged: the party doesn't know what it walked past.
   */
  protected search(): void {
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

  protected retreatReason(): string | undefined {
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
        if (why) return why;
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
