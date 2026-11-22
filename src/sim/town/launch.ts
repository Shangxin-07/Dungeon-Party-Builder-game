/**
 * Launch: send a party down, and deal with whatever comes back (M7.02,
 * DESIGN.md §17.1-17.3).
 *
 * The whole trip is simulated the moment the party sets off, so it stays
 * deterministic, but the town only learns what happened as days pass:
 *
 * - each night, the kills the party made that day come off the dungeon;
 * - on the day it climbs out, everything else lands (homecoming);
 * - if it falls or holes up, its site appears below, hidden (partyFalls),
 *   and the town hears only when a porter runs home, a search party finds
 *   it, it fights its way home, or the guild gives it up for lost
 *   (hearOfLoss).
 */
import {
  isScouting,
  runExpedition,
  type Deserter,
  type ExpeditionResult,
  type SiteVisit,
} from "../expedition";
import { afterLeading, partyCommand } from "../leadership";
import { learnFromKills, researchTiers } from "./research";
import { applyKills } from "../dungeon";
import { partyAlignment } from "../alignment";
import { fatigueTier, heroSheet, type Hero } from "../hero";
import { risenName } from "../fallen";
import { gainXp } from "../levels";
import type { Index } from "../library";
import { applyMorale, gearTags, moraleChanges, type Facts } from "../morale";
import {
  type LostSite,
  type Memorial,
  type Outing,
  type ScavengedGear,
  type TownState,
  type TripReport,
  TownError,
  TRIP_HISTORY,
  newRecord,
} from "./state";
import {
  xpBonus,
  built,
  haggler,
  marketRate,
  haulPrice,
  fence,
  findHero,
  maxHp,
  cantLaunch,
  liftFloors,
  outingStatus,
  rescueTarget,
  usualDays,
  awaySet,
} from "./read";
import { news, book, roll, edit, listWords, gearOf, addMaterials } from "./internal";
import type { HaulItem } from "../loot";
import { cancelRescue } from "./parties";
import { bringHome } from "./haul";
import { restHero, lowestHp, wasDowned, maybeInjure } from "./wounds";
import { dayInTown, quitters, guildFeels } from "./days";
import { newBody } from "./bodies";

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
  t.outings ??= [];
  const party = structuredClone(t.party.map((id) => findHero(t, id)!));
  const porters = structuredClone((t.porters ?? []).map((id) => findHero(t, id)!));
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
  // Who leads, and how unruly the party is (M7.05, DESIGN.md §17.5).
  const cmd = partyCommand(ix, party, t.leader);
  const result = runExpedition(ix, party, orders, seed, t.dungeon.floors, {
    site: visit,
    gear,
    porters,
    risen: t.risen ?? [],
    lift: liftFloors(ix, t),
    research: researchTiers(ix, t),
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
  const away = new Set([...awaySet(t), ...t.party, ...(t.porters ?? [])]);
  for (const h of t.roster) {
    if (away.has(h.id) || h.porter) continue;
    const fit = h.condition === "ok" && !(h.injuries ?? []).length && !fatigueTier(ix, h);
    if (fit) applyMorale(ix, h, { benched: 1 }, startDay);
  }

  const onFile = (t.parties ?? []).find(
    (p) => p.heroes.length === t.party.length && p.heroes.every((x) => t.party.includes(x)),
  );
  const called = name?.trim() || onFile?.name || `${(cmd.leader ?? party[0]!).name}'s party`;
  const expected = startDay + usualDays(ix, orders, liftFloors(ix, t));
  t.outings.push({
    id,
    name: called,
    left: startDay,
    expected,
    heroes: [...t.party],
    porters: [...(t.porters ?? [])],
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
      : `for floor ${orders.targetFloor}`;
  news(t, `${called} set off ${goal}. Expected back on day ${expected}.`);
  t.party = [];
  t.porters = [];
  delete t.leader;
  t.orders = cancelRescue(ix, t).orders;
  // A scout mission (M7.08) is a one-off: the next party delves, unless it's on file as scouts.
  if (t.orders.mission === "scout") delete t.orders.mission;
  return t;
}

// ---------------------------------------------------------------------------
// Day by day
// ---------------------------------------------------------------------------

/** Kills made by parties out below during the trip's days so far come off the dungeon. */
export function landKills(t: TownState): void {
  for (const o of t.outings ?? []) {
    const today = t.day - o.left;
    for (; o.killsLanded <= today; o.killsLanded++) {
      const k = o.result.dayKills?.[o.killsLanded];
      if (k) t.dungeon = applyKills(t.dungeon, k);
    }
  }
}

/** Kills not yet landed (a trip saved without them lands them all at once). */
function landAllKills(t: TownState, o: Outing): void {
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
  for (const o of [...(t.outings ?? [])]) {
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

// ---------------------------------------------------------------------------
// Home again
// ---------------------------------------------------------------------------

/** Kills per hero in a trip. */
function heroKills(party: readonly Hero[], result: ExpeditionResult): Record<string, number> {
  const kills: Record<string, number> = {};
  for (const e of result.log) {
    const c = e.combat;
    if (c?.kind === "killed" && c.actor && party.some((h) => h.id === c.actor))
      kills[c.actor] = (kills[c.actor] ?? 0) + 1;
  }
  return kills;
}

/** Back on the roster (a rescued hero, maybe given up for lost): off the memorial too. */
export function returnHero(t: TownState, h: Hero): void {
  const i = t.roster.findIndex((x) => x.id === h.id);
  if (i >= 0) t.roster[i] = structuredClone(h);
  else t.roster.push(structuredClone(h));
  t.memorial = t.memorial.filter((m) => !(m.heroId === h.id && m.fate === "lost"));
  t.records[h.id] ??= newRecord(t.day);
}

/** Write someone on the memorial, or update what it says about them. */
export function remember(t: TownState, m: Memorial): void {
  const old = m.heroId ? t.memorial.find((x) => x.heroId === m.heroId) : undefined;
  if (old) Object.assign(old, m);
  else t.memorial.push(m);
}

/** Keep a finished trip for the debrief and the replay. */
function keepTrip(t: TownState, report: TripReport): void {
  t.trips = [...(t.trips ?? []), report].slice(-TRIP_HISTORY);
  t.lastTrip = report;
}

/** A search order for something that's gone (found, home, or given up) is dropped. */
function tidySearch(ix: Index, t: TownState): void {
  const id = t.orders.rescue;
  if (!id) return;
  if (t.sites.some((s) => s.id === id)) return;
  if ((t.outings ?? []).some((o) => o.id === id)) {
    return;
  }
  // The party it was for has been given up or found: follow it to its site.
  const site = t.sites.find((s) => s.outingWas === id);
  if (site) t.orders = { ...t.orders, rescue: site.id };
  else t.orders = cancelRescue(ix, t).orders;
}

/** A party climbs out of the pit: everything about the trip lands in town. */
function homecoming(ix: Index, t: TownState, o: Outing): void {
  deserterReturns(ix, t, o);
  const result = o.result;
  // Deserters (M7.05) aren't with the party: they came home on their own, or never did.
  const party = o.party.filter((h) => !(result.deserters ?? []).some((d) => d.id === h.id));
  const startDay = o.left;
  const before = structuredClone(t.records);
  const risenBefore = new Map((t.risen ?? []).map((r) => [r.id, r]));
  t.outings = t.outings.filter((x) => x !== o);
  landAllKills(t, o);
  const kills = heroKills(party, result);
  // Every kill teaches the Library a little (M7.07).
  learnFromKills(ix, t, result.kills);

  // Searchers who found a lost party bring the news (and anyone alive) home.
  const visited = result.siteVisited ? t.sites.find((s) => s.id === result.siteVisited) : undefined;
  const lost = visited?.outing ? t.outings.find((x) => x.id === visited.outing) : undefined;
  if (lost) hearOfLoss(ix, t, lost, "found");

  // The Market pays the real value for the haul, whatever the party guessed,
  // less its cut, which the guild's best haggler talks down (anyone in town,
  // or back with this party).
  const back = (h: Hero) =>
    !o.heroes.includes(h.id) || result.party.some((p) => p.id === h.id && p.condition !== "dead");
  const haggle = haggler(ix, { ...t, roster: t.roster.filter(back) });
  const fenced = fence(ix, t);
  const recovered = result.haul.filter((h) => h.keep);
  const isMaterial = (h: HaulItem) => ix.item(h.item).slot === "material";
  const materials: Record<string, number> = {};
  for (const h of result.haul)
    if (!h.keep && isMaterial(h)) materials[h.item] = (materials[h.item] ?? 0) + 1;
  addMaterials(t, materials);
  // Coins into the purse; the rest waits in the debrief (M7.03). Morale and
  // the news go by what it's all worth at the Market, as before.
  const brought = bringHome(
    ix,
    t,
    result.haul.filter((h) => !h.keep && !isMaterial(h)),
    o.name,
    haggle.bonus,
    fenced,
  );
  const goldEarned = brought.worth;
  for (const g of result.gifts ?? []) {
    book(t, "gifts", g.gold);
    news(t, g.news, "good");
  }
  const hiddenGold = result.haul
    .filter((h) => h.hidden && !h.keep && !isMaterial(h))
    .reduce((s, h) => s + haulPrice(ix, h.item, h.value, haggle.bonus, fenced), 0);
  const tally = t.secrets ?? { found: 0, missed: 0, gold: 0 };
  t.secrets = {
    found: tally.found + result.secrets.found,
    missed: tally.missed + result.secrets.missed,
    gold: tally.gold + hiddenGold,
  };
  t.stash.push(...recovered.map((h) => h.item));
  t.scavenged = t.scavenged.filter((g) => !result.gearTaken.includes(g.id));
  bringIntel(ix, t, o);

  const { xp, levels, xpEach } = tripXp(ix, t, result);

  // Records, and anyone who died on the way: the party brings them home.
  let fallen = 0;
  for (const after of result.party) {
    const rec = t.records[after.id] ?? newRecord(startDay);
    rec.trips += 1;
    rec.kills += kills[after.id] ?? 0;
    rec.deepest = Math.max(rec.deepest, result.deepestFloor);
    for (const m of result.seen) if (!rec.seen.includes(m)) rec.seen.push(m);
    t.records[after.id] = rec;
    if (after.condition !== "dead") continue;
    fallen++;
    t.roster = t.roster.filter((h) => h.id !== after.id);
    remember(t, {
      heroId: after.id,
      name: after.name,
      classId: after.classId,
      day: t.day,
      floor: result.deepestFloor,
      fate: "dead",
      record: rec,
    });
    t.stash.push(...gearOf(ix, after).map((g) => g.item));
    t.bodies.push(newBody(t, after, t.day, 0));
  }
  for (const b of result.bodies) t.bodies.push({ ...b, floor: 0 });
  if (result.bodies.length)
    news(t, `The party carried home ${listWords(result.bodies.map((b) => b.hero.name))}.`, "good");
  for (const id of result.risenSlain) {
    const r = risenBefore.get(id);
    if (r) news(t, `${risenName(ix, r)} was put down on floor ${r.floor}.`, "good");
  }
  t.risen = (t.risen ?? []).filter((r) => !result.risenSlain.includes(r.id));

  // A search: take the freed heroes (and, for a recovery, the dead and the gear) off the site.
  if (visited) {
    const freed = new Set(result.rescued.map((h) => h.id));
    visited.trapped = visited.trapped.filter((x) => !freed.has(x.hero.id));
    visited.items = result.siteLeft;
    if (!result.siteBodiesLeft) visited.bodies = [];
    visited.visitor = undefined;
  }
  for (const s of t.sites) if (s.visitor === o.id) s.visitor = undefined;
  t.sites = t.sites.filter((s) => s.trapped.length || s.items.length || s.bodies.length);
  const rescued = result.rescued;
  for (const h of rescued) returnHero(t, h);

  // Back home: the party's heroes, as they came out of the pit.
  for (const after of result.party) {
    if (after.condition === "dead") continue;
    returnHero(t, after);
  }

  const { injuries, fatigue, fights, tiredBy } = wear(ix, t, party, result);

  // Porters: they watched the fights and bank some XP for when they train.
  for (const run of result.porters) {
    const p = findHero(t, run.id);
    if (!p?.porter) continue;
    const rec = t.records[p.id] ?? newRecord(startDay);
    rec.trips += 1;
    rec.deepest = Math.max(rec.deepest, result.deepestFloor);
    t.records[p.id] = rec;
    p.porter.watched += fights;
    p.porter.xp += Math.round(xpEach * ix.lib.town.porters.xpShare);
    p.fatigue = Math.min(100, (p.fatigue ?? 0) + tiredBy);
    fatigue[p.id] = p.fatigue;
  }

  // Deserters who never made it home are lost (M7.05).
  const strays = (result.deserters ?? []).filter((d) => !d.home);
  for (const d of strays) {
    t.roster = t.roster.filter((h) => h.id !== d.id);
    remember(t, {
      heroId: d.id,
      name: d.name,
      classId: d.hero.classId,
      day: o.left,
      floor: d.floor,
      fate: "lost",
      record: t.records[d.id] ?? newRecord(startDay),
    });
    news(
      t,
      `${d.name} slipped away from ${o.name} on floor ${d.floor} and never made it home.`,
      "bad",
    );
  }

  // How everyone feels about it (DESIGN.md §6). The leader's CHA keeps spirits
  // up (M7.05: the party's leader, not just its most charming hero).
  const morale: Record<string, { amount: number; reason: string }[]> = {};
  const cmd = partyCommand(ix, o.party, o.leader);
  const leaderCha = cmd.leader
    ? Math.max(10, heroSheet(ix, cmd.leader).stats.CHA)
    : Math.max(10, ...party.map((h) => heroSheet(ix, h).stats.CHA));
  const leaderLoss = cmd.moraleLoss;
  const share = goldEarned / party.length;
  const tripDays = Math.max(1, result.days);
  const aligned = partyAlignment(ix, party);
  const knewRisen = (h: Hero) =>
    result.risenMet.filter((id) => {
      const r = risenBefore.get(id);
      return !!r && (before[h.id]?.joined ?? Infinity) <= r.body.died;
    }).length;
  for (const left of party) {
    const h = findHero(t, left.id);
    if (!h || !result.party.some((p) => p.id === h.id && p.condition !== "dead")) continue;
    const prevDeepest = before[h.id]?.deepest ?? 0;
    const prevSeen = before[h.id]?.seen ?? [];
    const tags = gearTags(ix, left);
    const facts: Facts = {
      goldShare: share,
      // Scouts (M7.08) went to look, not to loot.
      emptyHanded:
        !result.intel && goldEarned + recovered.length + Object.keys(materials).length === 0
          ? 1
          : 0,
      kills: kills[h.id] ?? 0,
      newFloors: Math.max(0, result.deepestFloor - prevDeepest),
      sameOldFloor: result.deepestFloor <= prevDeepest ? 1 : 0,
      newMonsters: result.seen.filter((m) => !prevSeen.includes(m)).length,
      retreated: result.outcome === "retreated" ? 1 : 0,
      fallenComrades: fallen,
      allHome: fallen === 0 ? 1 : 0,
      rescuedComrades: rescued.length,
      wounded: h.condition !== "ok" || h.hp < maxHp(ix, h) / 3 ? 1 : 0,
      sentHurt: left.hp < maxHp(ix, left) * 0.75 ? 1 : 0,
      likedGear: left.likes && tags.has(left.likes) ? 1 : 0,
      dislikedGear: left.dislikes && tags.has(left.dislikes) ? 1 : 0,
      levelUp: levels[h.id] ?? 0,
      sentTired: fatigueTier(ix, left) ? 1 : 0,
      injured: injuries[h.id]?.length ? 1 : 0,
      alignmentClash: aligned.clashing.some((x) => x.id === h.id) ? tripDays : 0,
      partyDivided: aligned.divided ? tripDays : 0,
      goodEvilFriction:
        aligned.friction &&
        !aligned.clashing.some((x) => x.id === h.id) &&
        Math.abs(ix.alignment(h.alignment).position) >= 1
          ? tripDays
          : 0,
      foughtRisen: knewRisen(left),
      goodDeeds: result.deeds?.goodDeeds ?? 0,
      evilDeeds: result.deeds?.evilDeeds ?? 0,
      unholyGear: tags.has("unholy") ? 1 : 0,
      ledParty: h.id === o.leader ? 1 : 0,
      withDeserter: (h.grudges ?? []).filter((id) => o.party.some((x) => x.id === id)).length,
    };
    morale[h.id] = moraleChanges(ix, h, facts, { leaderCha, leaderLoss });
    applyMorale(ix, h, facts, t.day, { leaderCha, leaderLoss });
  }

  // The leader (M7.05): better for having led, and maybe changed by what happened.
  const leader = o.leader ? findHero(t, o.leader) : undefined;
  const deserted = result.deserters ?? [];
  let traits: string[] = [];
  if (leader && result.party.some((h) => h.id === leader.id && h.condition !== "dead")) {
    const gained = roll(t, (rng) =>
      afterLeading(
        ix,
        leader,
        {
          lostSomeone: fallen + strays.length > 0,
          bigWin: (result.bigWins ?? 0) > 0,
          deserted: deserted.length > 0,
        },
        t.day,
        o.name,
        rng,
      ),
    );
    traits = gained.map((d) => d.name);
    for (const d of gained)
      news(
        t,
        `${leader.name} has come back ${d.name.toLowerCase()} from leading ${o.name}.`,
        d.tone,
      );
  }
  // Deserters: the party made it home without them, and resents it; the dead's friends too.
  if (deserted.length) {
    const holders = new Set(result.party.filter((h) => h.condition !== "dead").map((h) => h.id));
    if (fallen) for (const h of grudgeHolders(ix, t)) holders.add(h.id);
    holdGrudges(ix, t, deserted, holders);
  }
  for (const h of rescued) {
    const r = findHero(t, h.id)!;
    morale[h.id] = moraleChanges(ix, r, { wasTrapped: 1 });
    applyMorale(ix, r, { wasTrapped: 1 }, t.day);
  }
  const home = new Set([...o.heroes, ...o.porters, ...rescued.map((h) => h.id)]);
  guildFeels(ix, t, { fallenComrades: fallen, rescuedComrades: rescued.length }, home);
  if (rescued.length)
    news(
      t,
      `${listWords(rescued.map((h) => h.name))} ${rescued.length > 1 ? "are" : "is"} home, rescued.`,
      "good",
    );

  // A night's sleep in their own beds.
  for (const h of t.roster) {
    if (!home.has(h.id)) continue;
    restHero(ix, h, 1);
    dayInTown(ix, t, h);
  }
  const quit = quitters(ix, t);
  // With nobody picked for the next trip, the party that just came home is.
  if (!t.party.length) {
    const ready = (id: string) => !!findHero(t, id);
    t.party = o.heroes.filter(ready);
    t.porters = o.porters.filter(ready);
    if (o.leader && t.party.includes(o.leader)) t.leader = o.leader;
  }
  tidySearch(ix, t);

  const what = {
    returned: "is back",
    retreated: "turned back early and is home",
    wiped: "",
    holed: "",
  }[result.outcome];
  news(
    t,
    `${o.name} ${what} after ${t.day - startDay} ${t.day - startDay === 1 ? "day" : "days"}, from floor ${result.deepestFloor}` +
      `${goldEarned ? `, with loot worth about ${goldEarned} gold` : ""}.`,
    fallen ? "bad" : "good",
  );
  keepTrip(t, {
    day: startDay,
    name: o.name,
    back: t.day,
    seed: o.seed,
    party,
    result,
    ...(cmd.leader ? { leader: cmd.leader.name } : {}),
    ...(traits.length ? { traits } : {}),
    ...(deserted.length
      ? { deserters: deserted.map((d) => ({ name: d.name, home: d.home, floor: d.floor })) }
      : {}),
    goldEarned,
    coins: brought.coins,
    held: brought.held,
    kills,
    raids: t.raids.filter((r) => r.day >= startDay && r.day < t.day),
    xp,
    levels,
    morale,
    trapped: [],
    rescued: rescued.map((h) => h.name),
    recovered,
    quit,
    injuries,
    fatigue,
    haggledBy: haggle.hero?.name,
    lootRate: marketRate(ix, ix.lib.town.haulRate + fenced / 100, haggle.bonus),
    hiddenGold,
    materials,
  });
}

/**
 * Scouts home (M7.08, DESIGN.md §17.8): what they saw on each floor becomes
 * the guild's floor intel, dated the day they were last there. Newer intel
 * replaces older.
 */
function bringIntel(ix: Index, t: TownState, o: Outing): void {
  const intel = o.result.intel;
  if (!intel?.length) return;
  t.intel ??= {};
  const start = ix.lib.time.startHour;
  for (const i of intel) {
    const day = o.left + Math.floor((start + i.hour) / 24);
    const old = t.intel[i.floor];
    if (old && old.day > day) continue;
    t.intel[i.floor] = { ...i, day, by: o.name };
  }
  const floors = intel.map((i) => i.floor).sort((a, b) => a - b);
  const slipped = o.result.slipped ?? 0;
  news(
    t,
    `${o.name} mapped ${floors.length === 1 ? `floor ${floors[0]}` : `floors ${listWords(floors.map(String))}`}` +
      `${slipped ? `, slipping past ${slipped} ${slipped === 1 ? "group" : "groups"} of monsters` : ""}. The scouting report has what they saw.`,
    "good",
  );
}

/** Experience: kills shared by everyone still alive, plus a little per floor. */
function tripXp(ix: Index, t: TownState, result: ExpeditionResult) {
  const killPower = result.kills.reduce((s, id) => s + ix.monster(id).power, 0);
  const living = result.party.filter((h) => h.condition !== "dead");
  const bonus = 1 + xpBonus(ix, t) / 100;
  const xpEach = living.length
    ? ((killPower * ix.lib.levels.xpPerPower) / living.length +
        ix.lib.levels.xpPerFloor * result.deepestFloor) *
      bonus
    : 0;
  const xp: Record<string, number> = {};
  const levels: Record<string, number> = {};
  for (const h of living) {
    xp[h.id] = Math.round(xpEach);
    levels[h.id] = roll(t, (rng) => gainXp(ix, h, xpEach, rng, built(t)));
  }
  return { xp, levels, xpEach };
}

/** Wear and tear: the trip tires everyone out, and a hero knocked down may bring home an injury. */
function wear(ix: Index, t: TownState, party: readonly Hero[], result: ExpeditionResult) {
  const fights = result.log.filter((e) => e.kind === "fight" && e.monsters).length;
  const tiredBy =
    ix.lib.wear.fatiguePerTripDay * result.days + ix.lib.wear.fatiguePerFight * fights;
  const injuries: Record<string, string[]> = {};
  const fatigue: Record<string, number> = {};
  for (const left of party) {
    const h = findHero(t, left.id);
    if (!h) continue;
    h.fatigue = Math.min(100, (h.fatigue ?? 0) + tiredBy);
    fatigue[h.id] = h.fatigue;
    const downed = wasDowned(result.log, h.id);
    const wounded = lowestHp(result.log, h.id) < ix.lib.wear.woundedBelow;
    if (downed || wounded) {
      const w = ix.lib.wear;
      const inj = maybeInjure(ix, t, h, downed ? w.injuryChance : w.woundedInjuryChance);
      if (inj) injuries[h.id] = [inj];
    }
  }
  return { injuries, fatigue, fights, tiredBy };
}

// ---------------------------------------------------------------------------
// Lost below
// ---------------------------------------------------------------------------

/**
 * The day a party falls or holes up: what's left of it lies below, at a site
 * the town doesn't know about yet. The trapped's clock starts now (DESIGN.md
 * §17.3). If a porter got away, the town hears at once.
 */
function partyFalls(ix: Index, t: TownState, o: Outing): void {
  const result = o.result;
  const holed = result.outcome === "holed";
  landAllKills(t, o);
  // The living earned their XP, trapped or not.
  tripXp(ix, t, result);
  const rs = ix.lib.rescue;
  const where = holed
    ? result.holed!
    : (result.wipeSite ?? { floor: result.deepestFloor, room: 1 });
  const site: LostSite = {
    id: `s${t.nextThingId++}`,
    floor: where.floor,
    room: where.room,
    day: t.day,
    outing: o.id,
    heading: result.orders.targetFloor,
    party: o.name,
    holed: holed || undefined,
    trapped: [],
    bodies: [],
    items: [...result.leftBehind],
  };
  const holdOut = holed ? result.holed!.supplies : rs.windowDays;
  const fallen = [...result.party, ...result.rescued];
  if (holed) fallen.push(...o.porterParty.map((p) => structuredClone(p)));
  for (const h of fallen) {
    if (h.condition !== "dead") {
      // Holed up, they're all alive. After a wipe, some may still be breathing.
      const end = heroSheet(ix, h).stats.END;
      const chance = Math.max(0.05, Math.min(0.95, rs.survival + (end - 10) * rs.survivalPerEnd));
      if (holed || roll(t, (rng) => rng.chance(chance))) {
        site.trapped.push({ hero: structuredClone(h), until: t.day + holdOut - 1 });
        continue;
      }
    }
    site.items.push(...gearOf(ix, h));
    site.bodies.push(newBody(t, h, t.day, site.floor));
  }
  for (const b of result.bodies) site.bodies.push({ ...b, floor: site.floor });
  t.risen = (t.risen ?? []).filter((r) => !result.risenSlain.includes(r.id));
  t.scavenged = t.scavenged.filter((g) => !result.gearTaken.includes(g.id));
  // If they were searching and got to a site first, what they took is gone from it.
  const visited = result.siteVisited && t.sites.find((s) => s.id === result.siteVisited);
  if (visited) {
    const freed = new Set(result.rescued.map((h) => h.id));
    visited.trapped = visited.trapped.filter((x) => !freed.has(x.hero.id));
    visited.items = result.siteLeft;
    if (!result.siteBodiesLeft) visited.bodies = [];
  }
  for (const s of t.sites) if (s.visitor === o.id) s.visitor = undefined;
  t.sites = t.sites.filter((s) => s.trapped.length || s.items.length || s.bodies.length);
  t.sites.push(site);
  o.fell = t.day;
  o.site = site.id;
  if (result.porters.some((p) => p.home)) hearOfLoss(ix, t, o, "porters");
}

/**
 * The town hears what became of a party that didn't come home (M7.02):
 * - "porters": a porter ran home with the news, and knows where;
 * - "found": a search party found where it fell (it brings the news home);
 * - "home": survivors of a party that holed up made it out on their own;
 * - "given-up": nothing for days, and the guild gives them up for lost.
 */
export function hearOfLoss(
  ix: Index,
  t: TownState,
  o: Outing,
  how: "porters" | "found" | "home" | "given-up",
  /** Heroes who made it home with the news ("home"): they're not lost. */
  back: ReadonlySet<string> = new Set(),
): void {
  if (!t.outings.includes(o)) return;
  deserterReturns(ix, t, o);
  t.outings = t.outings.filter((x) => x !== o);
  landAllKills(t, o);
  const result = o.result;
  const site = t.sites.find((s) => s.id === o.site);
  const knowWhere = how !== "given-up";
  if (site) {
    site.outing = undefined;
    site.outingWas = o.id;
    site.heard = t.day;
    site.unknown = knowWhere ? undefined : true;
  }
  const kills = heroKills(o.party, result);
  const floor = site?.floor ?? result.deepestFloor;
  const members = new Set([...o.heroes, ...o.porters]);
  const ranHome = new Set(result.porters.filter((p) => p.home).map((p) => p.id));
  // Whoever's at home (and any porter who ran back) haggles over what they brought.
  const haggle = haggler(ix, {
    ...t,
    roster: t.roster.filter((h) => !members.has(h.id) || ranHome.has(h.id)),
  });
  for (const id of members) {
    const rec = t.records[id] ?? newRecord(o.left);
    if (o.heroes.includes(id)) {
      rec.trips += 1;
      rec.kills += kills[id] ?? 0;
      rec.deepest = Math.max(rec.deepest, result.deepestFloor);
      for (const m of result.seen) if (!rec.seen.includes(m)) rec.seen.push(m);
    }
    t.records[id] = rec;
  }

  // Who's gone: everyone the town still had down as away, except porters
  // who ran home. The dead are known dead once someone has seen them.
  const missing: string[] = [];
  let dead = 0;
  for (const id of members) {
    if (ranHome.has(id) || back.has(id)) continue;
    const h =
      findHero(t, id) ?? o.party.find((x) => x.id === id) ?? o.porterParty.find((x) => x.id === id);
    if (!h) continue;
    t.roster = t.roster.filter((x) => x.id !== id);
    t.party = t.party.filter((x) => x !== id);
    t.porters = (t.porters ?? []).filter((x) => x !== id);
    const trapped = site?.trapped.some((x) => x.hero.id === id);
    const body = site?.bodies.some((b) => b.hero.id === id);
    if (trapped && knowWhere) continue;
    const known = knowWhere && (!trapped || !!body);
    if (known) dead++;
    else missing.push(h.name);
    remember(t, {
      heroId: id,
      name: h.name,
      classId: h.classId,
      day: known ? (site?.bodies.find((b) => b.hero.id === id)?.died ?? t.day) : o.left,
      floor: known ? floor : result.orders.targetFloor,
      fate: known ? "dead" : "lost",
      record: t.records[id]!,
    });
  }
  // Porters who got away: they watched the fights and bank some XP.
  const fights = result.log.filter((e) => e.kind === "fight" && e.monsters).length;
  for (const run of result.porters) {
    if (!run.home) continue;
    const p = findHero(t, run.id);
    if (!p?.porter) continue;
    p.porter.watched += fights;
    p.fatigue = Math.min(100, (p.fatigue ?? 0) + ix.lib.wear.fatiguePerFight * fights);
  }
  const fallen = dead + missing.length;
  const already = o.givenUp !== undefined;
  if (fallen && !already) guildFeels(ix, t, { fallenComrades: fallen }, new Set());
  // Deserters who made it home (M7.05): the dead's friends won't forgive them.
  const ran = (result.deserters ?? []).filter((d) => d.home && findHero(t, d.id));
  if (fallen && ran.length && !already)
    holdGrudges(ix, t, ran, new Set(grudgeHolders(ix, t).map((h) => h.id)));

  if (how === "porters") {
    const ran = result.porters.filter((r) => r.home).map((r) => r.name);
    news(
      t,
      `${listWords(ran)} ran back from floor ${floor} with news of ${o.name}` +
        `${result.porterHaul.length ? " and what loot they could carry" : ""}.`,
      "bad",
    );
    const brought = bringHome(
      ix,
      t,
      result.porterHaul.filter((h) => !h.keep && ix.item(h.item).slot !== "material"),
      o.name,
      haggle.bonus,
      fence(ix, t),
    );
    const goldEarned = brought.worth;
    const materials: Record<string, number> = {};
    for (const h of result.porterHaul)
      if (ix.item(h.item).slot === "material") materials[h.item] = (materials[h.item] ?? 0) + 1;
    addMaterials(t, materials);
    const trapped = site?.trapped.map((x) => x.hero.name) ?? [];
    for (const n of trapped)
      news(
        t,
        `${n} is trapped on floor ${floor}, alive. A rescue party has ${ix.lib.rescue.windowDays} days at most.`,
        "bad",
      );
    // They saw it all, up to the end: the trip can be watched.
    keepTrip(t, {
      day: o.left,
      name: o.name,
      back: t.day,
      seed: o.seed,
      party: o.party,
      result,
      goldEarned,
      coins: brought.coins,
      held: brought.held,
      kills,
      raids: t.raids.filter((r) => r.day >= o.left && r.day < t.day),
      trapped,
      materials,
    });
  } else if (how === "given-up" && !already) {
    news(
      t,
      `Nothing has been heard of ${o.name} since they left on day ${o.left}. ` +
        `The guild gives ${listWords(missing)} up for lost.`,
      "bad",
    );
  }
  tidySearch(ix, t);
}

/**
 * Give a party that's possibly lost up for lost (M7.02): its heroes come off
 * the roster (freeing their places) and the payroll, and go on the memorial
 * as lost. If they turn up after all, they're back on the roster. A search
 * can still be sent for them.
 */
export function giveUp(ix: Index, town: TownState, outingId: string): TownState {
  const found = (town.outings ?? []).find((o) => o.id === outingId);
  if (!found) throw new TownError("They're not out there any more.");
  if (outingStatus(ix, town, found) !== "lost")
    throw new TownError(`It's too soon to give up on ${found.name}.`);
  if (found.givenUp !== undefined) throw new TownError(`${found.name} is already given up.`);
  const t = edit(town);
  const o = t.outings.find((x) => x.id === outingId)!;
  if (o.fell !== undefined) {
    hearOfLoss(ix, t, o, "given-up");
    return t;
  }
  o.givenUp = t.day;
  const names: string[] = [];
  for (const id of [...o.heroes, ...o.porters]) {
    const h = findHero(t, id);
    if (!h) continue;
    names.push(h.name);
    t.roster = t.roster.filter((x) => x.id !== id);
    remember(t, {
      heroId: id,
      name: h.name,
      classId: h.classId,
      day: o.left,
      floor: o.result.orders.targetFloor,
      fate: "lost",
      record: t.records[id] ?? newRecord(o.left),
    });
  }
  guildFeels(ix, t, { fallenComrades: names.length }, new Set());
  news(t, `The guild gives ${listWords(names)} up for lost.`, "bad");
  return t;
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

// ---------------------------------------------------------------------------
// Deserters (M7.05, DESIGN.md §17.5)
// ---------------------------------------------------------------------------

/** The day a deserter walks into town. */
function deserterDay(ix: Index, o: Outing, d: Deserter): number {
  return o.left + Math.floor((ix.lib.time.startHour + d.back) / 24);
}

/** Deserters who made it home and haven't been seen yet come in now (the party's back, or lost). */
function deserterReturns(ix: Index, t: TownState, o: Outing): void {
  for (const d of o.result.deserters ?? []) if (d.home) deserterHome(ix, t, o, d);
}

/**
 * A deserter walks back into town alone. They're back on the roster, and
 * their account is all the guild knows of the trip so far: it stops where
 * they ran, and they tell it their way.
 */
function deserterHome(ix: Index, t: TownState, o: Outing, d: Deserter): void {
  if ((o.deserted ?? []).includes(d.id)) return;
  o.deserted = [...(o.deserted ?? []), d.id];
  o.heroes = o.heroes.filter((id) => id !== d.id);
  const day = Math.min(t.day, deserterDay(ix, o, d));
  const h = structuredClone(d.hero);
  returnHero(t, h);
  const back = findHero(t, d.id)!;
  const rec = t.records[d.id] ?? newRecord(o.left);
  rec.trips += 1;
  rec.deepest = Math.max(rec.deepest, d.floor);
  t.records[d.id] = rec;
  back.fatigue = Math.min(
    100,
    (back.fatigue ?? 0) + ix.lib.wear.fatiguePerTripDay * Math.max(1, day - o.left),
  );
  applyMorale(ix, back, { deserted: 1 }, t.day);

  // Their account: what they saw, up to the moment they ran.
  const leader = o.party.find((x) => x.id === o.leader && x.id !== d.id);
  const blame = roll(t, (rng) => {
    const evil = d.hero.alignment === "evil";
    if (leader && rng.chance(evil ? 0.7 : 0.4))
      return `"${leader.name} led us straight into it," ${d.name} says.`;
    return rng.pick([
      `"Someone had to get word back," ${d.name} says.`,
      `"There was nothing I could have done," ${d.name} says.`,
      `"I got separated in the dark," ${d.name} says.`,
    ]);
  });
  news(
    t,
    `${d.name} came back alone, saying they lost ${o.name} on floor ${d.floor} as the ${d.from} came at them. ${blame}`,
    "bad",
  );
  const saw = o.result.log.slice(0, d.saw);
  const result: ExpeditionResult = {
    ...o.result,
    outcome: "retreated",
    // As far as they know, everyone was standing when they left.
    party: structuredClone(o.party),
    deserters: [d],
    rescued: [],
    bodies: [],
    deepestFloor: d.floor,
    hours: d.left,
    days: Math.max(1, day - o.left),
    roomsVisited: saw.filter((e) => e.kind === "room").length,
    haul: [],
    leftBehind: [],
    porterHaul: [],
    kills: [],
    floorKills: {},
    dayKills: {},
    log: saw,
    secrets: { found: saw.filter((e) => e.kind === "secret").length, missed: 0 },
    gifts: [],
  };
  keepTrip(t, {
    day: o.left,
    name: o.name,
    back: day,
    seed: o.seed,
    party: o.party,
    result,
    account: { by: d.name, floor: d.floor, room: d.room, blame },
    ...(leader ? { leader: leader.name } : {}),
    goldEarned: 0,
    kills: heroKills(o.party, result),
    raids: t.raids.filter((r) => r.day >= o.left && r.day < day),
  });
}

/** Who holds a grudge against a deserter when someone died (content/leadership.ts `grudge`). */
function grudgeHolders(ix: Index, t: TownState): Hero[] {
  const g = ix.lib.leadership.grudge;
  return t.roster.filter(
    (h) =>
      !h.porter && (g.motivations.includes(h.motivation) || g.alignments.includes(h.alignment)),
  );
}

/** These heroes won't forgive these deserters (M7.05). */
function holdGrudges(
  ix: Index,
  t: TownState,
  deserters: readonly Deserter[],
  holders: ReadonlySet<string>,
): void {
  for (const id of holders) {
    const h = findHero(t, id);
    if (!h) continue;
    const fresh = deserters.filter((d) => d.id !== id && !(h.grudges ?? []).includes(d.id));
    if (!fresh.length) continue;
    h.grudges = [...(h.grudges ?? []), ...fresh.map((d) => d.id)];
    applyMorale(ix, h, { grudge: fresh.length }, t.day);
  }
}
