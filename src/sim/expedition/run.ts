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
import { type StandingOrders, describeRetreat } from "./orders";
import type { ExpeditionResult, ExpeditionExtras } from "./report";
import { WANDER_CHANCE } from "./tuning";
import { list } from "./trip";
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

/** One trip, from setting off to coming home (or not). */
export class Expedition extends TripRescue {
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
  protected goHome(outcome: "returned" | "retreated"): ExpeditionResult {
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

  protected finish(outcome: ExpeditionResult["outcome"]): ExpeditionResult {
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
      deeds: this.deeds,
      gifts: wiped ? [] : this.gifts,
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

  protected retreatReason(): string | undefined {
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
