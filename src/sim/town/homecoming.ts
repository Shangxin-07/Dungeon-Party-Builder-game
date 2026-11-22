/**
 * Home again (M7.02): a party climbs out of the pit, and the haul, XP,
 * records, wear and morale of the trip land in town. See launch.ts.
 */
import { type ExpeditionResult } from "../expedition";
import { afterLeading, partyCommand } from "../leadership";
import { learnFromKills } from "./research";
import { partyAlignment } from "../alignment";
import { fatigueTier, heroSheet, type Hero } from "../hero";
import { risenName } from "../fallen";
import { gainXp } from "../levels";
import type { Index } from "../library";
import { applyMorale, gearTags, moraleChanges, type Facts } from "../morale";
import {
  type Memorial,
  type Outing,
  type TownState,
  type TripReport,
  TRIP_HISTORY,
  newRecord,
} from "./state";
import { xpBonus, built, haggler, marketRate, haulPrice, fence, findHero, maxHp } from "./read";
import { news, book, roll, listWords, gearOf, addMaterials } from "./internal";
import type { HaulItem } from "../loot";
import { cancelRescue } from "./parties";
import { bringHome } from "./haul";
import { payShares } from "./pay";
import { recordSightings } from "./fog";
import { restHero, lowestHp, wasDowned, maybeInjure } from "./wounds";
import { dayInTown, quitters, guildFeels } from "./days";
import { newBody } from "./bodies";
import { sealHome } from "./seals";
import { landAllKills } from "./launch";
import { hearOfLoss } from "./lost";
import { deserterReturns, grudgeHolders, holdGrudges } from "./deserters";

/** Kills per hero in a trip. */
export function heroKills(
  party: readonly Hero[],
  result: ExpeditionResult,
): Record<string, number> {
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
export function keepTrip(t: TownState, report: TripReport): void {
  t.trips = [...(t.trips ?? []), report].slice(-TRIP_HISTORY);
  t.lastTrip = report;
}

/** A search order for something that's gone (found, home, or given up) is dropped. */
export function tidySearch(ix: Index, t: TownState): void {
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
export function homecoming(ix: Index, t: TownState, o: Outing): void {
  deserterReturns(ix, t, o);
  const result = ownResult(o);
  // Deserters (M7.05) aren't with the party: they came home on their own, or never did.
  const party = o.party.filter((h) => !(result.deserters ?? []).some((d) => d.id === h.id));
  const startDay = o.left;
  const before = structuredClone(t.records);
  const risenBefore = new Map((t.risen ?? []).map((r) => [r.id, r]));
  t.outings = t.outings.filter((x) => x !== o);
  landAllKills(t, o);
  sealHome(ix, t, o);
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
  recordSightings(ix, t, o);
  lairNews(ix, t, o);

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

  // Pay (M7.12): everyone who went and came back takes a share of the haul.
  const takers = [
    ...party.filter((h) => result.party.some((p) => p.id === h.id && p.condition !== "dead")),
    ...result.porters,
  ]
    .map((h) => findHero(t, h.id))
    .filter((h): h is Hero => !!h);
  const shares = payShares(ix, t, takers, goldEarned);

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
      goldShare: shares[h.id] ?? 0,
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
    shares,
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

/**
 * Back from a lair (M7.08): what the party fetched, or the beast dead. A dead
 * beast's floor is that much safer: `calms` of its monsters move off.
 */
function lairNews(ix: Index, t: TownState, o: Outing): void {
  const visit = o.result.lair;
  if (!visit) return;
  const lair = ix.lair(visit.id);
  const beast = ix.monster(lair.monster).name;
  switch (visit.outcome) {
    case "fetched":
      news(
        t,
        `${o.name} crept into ${lair.name.replace(/^The /, "the ")} and out again, unheard.`,
        "good",
      );
      break;
    case "slain": {
      t.lairs = { ...(t.lairs ?? {}), [lair.id]: { slain: t.day } };
      const f = t.dungeon.floors[lair.floor - 1];
      if (f) f.population = Math.max(0, f.population - lair.calms);
      news(t, `${o.name} killed the ${beast}! Floor ${lair.floor} is quieter without it.`, "good");
      break;
    }
    case "fled":
      news(t, `${o.name} ran from the ${beast}: nothing they had could hurt it.`, "bad");
      break;
    case "fought":
      news(t, `${o.name} fought the ${beast} and couldn't finish it.`, "bad");
      break;
  }
}

/**
 * The outing's result, safe to change: edit() shares it with the town before
 * the action (it's big), so the first change takes a copy of its own.
 */
export function ownResult(o: Outing): ExpeditionResult {
  return (o.result = structuredClone(o.result));
}

/** Experience: kills shared by everyone still alive, plus a little per floor. */
export function tripXp(ix: Index, t: TownState, result: ExpeditionResult) {
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
