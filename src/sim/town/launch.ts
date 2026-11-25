/**
 * Launch: send a party down, and deal with whatever comes back (M7.02,
 * DESIGN.md §17.1-17.3).
 *
 * The whole trip is simulated the moment the party sets off, so it stays
 * deterministic, but the town only learns what happened as days pass:
 *
 * - each night, the kills the party made that day come off the dungeon;
 * - on the day it climbs out, everything else lands (homecoming.ts);
 * - if it falls or holes up, its site appears below, hidden (lost.ts
 *   partyFalls), and the town hears only when a porter runs home, a search
 *   party finds it, it fights its way home, or the guild gives it up for
 *   lost (hearOfLoss);
 * - deserters walk home on their own (deserters.ts).
 */
import { openShards } from "./shards";
import { isScouting, isSneaking, lairOf, runExpedition, type SiteVisit } from "../expedition";
import { partyCommand } from "../leadership";
import { researchTiers } from "./research";
import { applyKills } from "../dungeon";
import { fatigueTier } from "../hero";
import type { Index } from "../library";
import { applyMorale } from "../morale";
import { type Outing, type ScavengedGear, type TownState, TownError } from "./state";
import {
  findHero,
  cantLaunch,
  liftFloors,
  outingStatus,
  rescueTarget,
  usualDays,
  awaySet,
} from "./read";
import { news, roll, edit } from "./internal";
import { cancelRescue } from "./parties";
import { carrySeal, placeSeal } from "./seals";
import { carryStone, placeStone } from "./stones";
import { forwardCamp } from "./digging";
import { homecoming } from "./homecoming";
import { hearOfLoss, partyFalls } from "./lost";
import { deserterDay, deserterHome } from "./deserters";

/**
 * Send the party. It's away until the town hears of it: see the top of this
 * file. `name` defaults to the party on file with the same heroes, if any.
 */
export function launch(
  ix: Index,
  town: TownState,
  _names: readonly string[],
  name?: string,
): TownState {
  const why = cantLaunch(ix, town);
  if (why) throw new TownError(why);
  const t = edit(town);
  const party = structuredClone(t.party.map((id) => findHero(t, id)!));
  const porters = structuredClone(t.porters.map((id) => findHero(t, id)!));
  const seed = roll(t, (rng) => rng.int(0, 2 ** 31 - 1));
  const startDay = t.day;
  const id = `o${t.nextThingId++}`;

  // A search: the site as it is now, and how long each trapped hero can hold
  // out, in hours of this trip (the rescue clock started when they fell).
  const target = rescueTarget(t);
  const site = target?.site && !target.site.visitor ? target.site : undefined;
  const start = ix.lib.time.startHour;
  const visit: SiteVisit | undefined = site && {
    id: site.id,
    floor: site.floor,
    room: site.room,
    trapped: site.trapped.map((x) => x.hero),
    until: Object.fromEntries(
      site.trapped.map((x) => [x.hero.id, (x.until - startDay + 1) * 24 - start]),
    ),
    bodies: site.bodies ?? [],
    items: site.items,
  };
  const gear: Record<number, ScavengedGear[]> = {};
  for (const g of t.scavenged) (gear[g.floor] ??= []).push(g);

  const orders = { ...t.orders };
  if (target) orders.targetFloor = Math.max(orders.targetFloor, site?.floor ?? 0);
  // The barricade goes down with the party (M7.16).
  carrySeal(ix, t, orders);
  // And the Seal Stone (M8.17).
  carryStone(ix, t, orders);
  // A forward camp on a held floor (M8.20): paths down, and a night's rest.
  const camp = forwardCamp(ix, t);
  // Who leads, and how unruly the party is (M7.05, DESIGN.md §17.5).
  const cmd = partyCommand(ix, party, t.leader);
  const result = runExpedition(ix, party, orders, seed, t.dungeon.floors, {
    site: visit,
    gear,
    porters,
    risen: t.risen,
    lift: liftFloors(ix, t),
    ...(camp ? { camp } : {}),
    research: researchTiers(ix, t),
    slainLairs: Object.keys(t.lairs).filter((id) => t.lairs[id]?.slain),
    shards: openShards(ix, t),
    leader: cmd.leader && {
      id: cmd.leader.id,
      disobey: cmd.disobey,
      desert: cmd.desert,
      ...(cmd.retreatEarly ? { retreatEarly: cmd.retreatEarly } : {}),
    },
  });
  // The site waits for this party: nothing changes there until it's back.
  if (site && result.siteVisited === site.id) site.visitor = id;

  // Fit heroes left at home while the party went down (Glory heroes mind).
  const away = new Set([...awaySet(t), ...t.party, ...t.porters]);
  for (const h of t.roster) {
    if (away.has(h.id) || h.porter) continue;
    const fit = h.condition === "ok" && !h.injuries.length && !fatigueTier(ix, h);
    if (fit) applyMorale(ix, h, { benched: 1 }, startDay);
  }

  const onFile = t.parties.find(
    (p) => p.heroes.length === t.party.length && p.heroes.every((x) => t.party.includes(x)),
  );
  const called = name?.trim() || onFile?.name || `${(cmd.leader ?? party[0]!).name}'s party`;
  const expected = startDay + usualDays(ix, orders, liftFloors(ix, t), camp);
  t.outings.push({
    id,
    name: called,
    left: startDay,
    expected,
    heroes: [...t.party],
    porters: [...t.porters],
    ...(cmd.leader ? { leader: cmd.leader.id } : {}),
    seed,
    party,
    porterParty: porters,
    result,
    killsLanded: 0,
  });
  const goal = target
    ? `to look for ${target.outing?.name ?? site?.party ?? "the lost"} on floor ${orders.targetFloor}`
    : isScouting(orders)
      ? `to scout ${orders.targetFloor === 1 ? "floor 1" : `floors 1 to ${orders.targetFloor}`}`
      : lairOf(orders)
        ? `${isSneaking(orders) ? "to sneak into" : "to take on what lives in"} ${ix.lair(lairOf(orders)!).name.replace(/^The /, "the ")}`
        : `for floor ${orders.targetFloor}`;
  news(t, `${called} set off ${goal}. Expected back on day ${expected}.`);
  t.party = [];
  t.porters = [];
  delete t.leader;
  t.orders = cancelRescue(ix, t).orders;
  // Scout and sneak missions (M7.08) are one-offs: the next party delves, unless it's on file.
  if (t.orders.mission === "scout" || t.orders.mission === "sneak") delete t.orders.mission;
  delete t.orders.lair;
  // So is a hunt (M7.10): one party clearing a floor mustn't send the next
  // party, fresh recruits perhaps, off to clear it too. Parties on file keep theirs.
  delete t.orders.clearPercent;
  // And so is sealing the stairs (M7.16): it uses up what's in the store.
  delete t.orders.seal;
  delete t.orders.stone;
  // And going for the heart (M8.22).
  delete t.orders.core;
  return t;
}

// ---------------------------------------------------------------------------
// Day by day
// ---------------------------------------------------------------------------

/**
 * Kills made by parties out below during the trip's days so far come off the
 * dungeon, and any stairs they sealed are sealed (M7.16).
 */
export function landKills(ix: Index, t: TownState): void {
  for (const o of t.outings) {
    placeSeal(ix, t, o);
    placeStone(ix, t, o);
    const today = t.day - o.left;
    for (; o.killsLanded <= today; o.killsLanded++) {
      const k = o.result.dayKills?.[o.killsLanded];
      if (k) t.dungeon = applyKills(t.dungeon, k);
    }
  }
}

/** Kills not yet landed (a trip saved without them lands them all at once). */
export function landAllKills(t: TownState, o: Outing): void {
  if (!o.result.dayKills) {
    if (!o.killsLanded) t.dungeon = applyKills(t.dungeon, o.result.floorKills);
  } else {
    const last = Math.max(-1, ...Object.keys(o.result.dayKills).map(Number));
    for (; o.killsLanded <= last; o.killsLanded++) {
      const k = o.result.dayKills[o.killsLanded];
      if (k) t.dungeon = applyKills(t.dungeon, k);
    }
  }
  o.killsLanded = Infinity;
}

/**
 * The start of a new day (after endOfDay moved the clock on): parties that
 * climb out today come home, parties that fell are lost below, and the town
 * frets about anyone late.
 */
export function arrivals(ix: Index, t: TownState): void {
  for (const o of [...t.outings]) {
    const r = o.result;
    // Deserters who slipped away (M7.05) walk in alone, ahead of the party.
    for (const d of r.deserters ?? [])
      if (d.home && t.day >= deserterDay(ix, o, d)) deserterHome(ix, t, o, d);
    const end = o.left + r.days;
    if (o.fell === undefined && t.day >= end) {
      if (r.outcome === "wiped" || r.outcome === "holed") partyFalls(ix, t, o);
      else {
        homecoming(ix, t, o);
        continue;
      }
    }
    if (!t.outings.includes(o)) continue;
    const late = t.day - o.expected;
    const rs = ix.lib.rescue;
    if (late === rs.overdueDays)
      news(t, `${o.name} should have been back yesterday. They're overdue.`, "bad");
    if (late === rs.lostDays)
      news(
        t,
        `Still no sign of ${o.name}. They may be lost: a party sent after them can look on floor ${r.orders.targetFloor}.`,
        "bad",
      );
    if (o.fell !== undefined && late >= rs.giveUpDays) hearOfLoss(ix, t, o, "given-up");
  }
}

/** How a party that's out looks from town, for the UI and the bot. */
export const outingView = (ix: Index, t: TownState, o: Outing) => ({
  id: o.id,
  name: o.name,
  left: o.left,
  expected: o.expected,
  status: outingStatus(ix, t, o),
  floor: o.result.orders.targetFloor,
});
