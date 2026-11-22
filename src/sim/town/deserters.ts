/**
 * Deserters (M7.05, DESIGN.md §17.5): heroes who slipped away from their
 * party and walk home alone, and the grudges they leave. See launch.ts.
 */
import { type Deserter, type ExpeditionResult } from "../expedition";
import { type Hero } from "../hero";
import type { Index } from "../library";
import { applyMorale } from "../morale";
import { type Outing, type TownState, newRecord } from "./state";
import { findHero } from "./read";
import { news, roll } from "./internal";
import { heroKills, keepTrip, returnHero } from "./homecoming";

/** The day a deserter walks into town. */
export function deserterDay(ix: Index, o: Outing, d: Deserter): number {
  return o.left + Math.floor((ix.lib.time.startHour + d.back) / 24);
}

/** Deserters who made it home and haven't been seen yet come in now (the party's back, or lost). */
export function deserterReturns(ix: Index, t: TownState, o: Outing): void {
  for (const d of o.result.deserters ?? []) if (d.home) deserterHome(ix, t, o, d);
}

/**
 * A deserter walks back into town alone. They're back on the roster, and
 * their account is all the guild knows of the trip so far: it stops where
 * they ran, and they tell it their way.
 */
export function deserterHome(ix: Index, t: TownState, o: Outing, d: Deserter): void {
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
    back.fatigue + ix.lib.wear.fatiguePerTripDay * Math.max(1, day - o.left),
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
export function grudgeHolders(ix: Index, t: TownState): Hero[] {
  const g = ix.lib.leadership.grudge;
  return t.roster.filter(
    (h) =>
      !h.porter && (g.motivations.includes(h.motivation) || g.alignments.includes(h.alignment)),
  );
}

/** These heroes won't forgive these deserters (M7.05). */
export function holdGrudges(
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
