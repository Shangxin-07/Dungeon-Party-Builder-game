/**
 * Leaders and command (M7.05, DESIGN.md §17.5). Each party has a leader, the
 * player's pick or else its best Leadership. The leader's Leadership sets
 * their command, and every other hero costs command by their alignment step
 * from the leader. Over command is allowed, but the party gets unruly: heroes
 * may ignore orders, or desert before a bad fight. Rules in
 * content/leadership.ts, traits in content/traits/.
 */
import type { LeaderEvent, TraitDef } from "../content/types";
import { steps } from "./alignment";
import { heroSheet, type Hero, type LeaderRecord } from "./hero";
import type { Index } from "./library";
import type { Rng } from "./rng";

/** A hero's Leadership skill, 0-100. */
export const leadershipOf = (ix: Index, h: Hero): number => heroSheet(ix, h).skills.leadership ?? 0;

/** The traits a hero carries as a leader (any no longer in the content are skipped). */
export function traitsOf(ix: Index, h: Hero): TraitDef[] {
  const out: TraitDef[] = [];
  for (const t of h.lead?.traits ?? []) {
    const def = ix.lib.traits.find((d) => d.id === t.id);
    if (def) out.push(def);
  }
  return out;
}

/** How many heroes this hero can lead well, from their Leadership and traits. */
export function commandOf(ix: Index, h: Hero): number {
  const value = leadershipOf(ix, h);
  let command = 0;
  for (const row of ix.lib.leadership.command) if (value >= row.from) command = row.command;
  for (const t of traitsOf(ix, h)) command += t.command ?? 0;
  return Math.max(1, command);
}

/** Command a hero costs under this leader: by alignment step (the leader costs nothing). */
export function commandCost(ix: Index, leader: Hero, h: Hero): number {
  if (h.id === leader.id) return 0;
  const rules = ix.lib.leadership;
  const step = Math.min(rules.alignCost.length - 1, steps(ix, leader.alignment, h.alignment));
  let cost = rules.alignCost[step]!;
  if (step >= 2)
    for (const t of traitsOf(ix, leader))
      if (t.farCost !== undefined) cost = Math.min(cost, t.farCost);
  return cost;
}

/** The party's natural leader: the best Leadership (the first listed on a tie). */
export function bestLeader(ix: Index, party: readonly Hero[]): Hero | undefined {
  let best: Hero | undefined;
  let value = -1;
  for (const h of party) {
    const v = leadershipOf(ix, h);
    if (v > value) [best, value] = [h, v];
  }
  return best;
}

/** The leader: the one picked, if they're in the party, else the natural leader. */
export function pickLeader(ix: Index, party: readonly Hero[], chosen?: string): Hero | undefined {
  return party.find((h) => h.id === chosen) ?? bestLeader(ix, party);
}

/** A party's command: who leads, how far it stretches, and how unruly everyone is. */
export interface Command {
  leader?: Hero;
  leadership: number;
  command: number;
  /** Command the party uses (porters cost nothing). */
  used: number;
  /** Command over, plus any unruliness from the leader's traits: 0 when all is well. */
  over: number;
  /** Each hero's command cost, by id. */
  costs: Record<string, number>;
  /** Each hero's chance to ignore an order at each order check, by id. */
  disobey: Record<string, number>;
  /** Each hero's chance to slip away before a fight that looks bad, by id. */
  desert: Record<string, number>;
  /** From the leader's traits: retreat this many HP percent sooner; extra morale loss percent. */
  retreatEarly: number;
  moraleLoss: number;
}

/** Work out a party's command (DESIGN.md §17.5). */
export function partyCommand(ix: Index, party: readonly Hero[], chosen?: string): Command {
  const rules = ix.lib.leadership;
  const leader = pickLeader(ix, party, chosen);
  const out: Command = {
    leader,
    leadership: leader ? leadershipOf(ix, leader) : 0,
    command: leader ? commandOf(ix, leader) : 0,
    used: 0,
    over: 0,
    costs: {},
    disobey: {},
    desert: {},
    retreatEarly: 0,
    moraleLoss: 0,
  };
  if (!leader) return out;
  const traits = traitsOf(ix, leader);
  let unruly = 0;
  let desertBy = 1;
  for (const t of traits) {
    unruly += t.unruly ?? 0;
    desertBy *= t.desert ?? 1;
    out.retreatEarly += t.retreatEarly ?? 0;
    out.moraleLoss += t.moraleLoss ?? 0;
  }
  for (const h of party) {
    out.costs[h.id] = commandCost(ix, leader, h);
    out.used += out.costs[h.id]!;
  }
  out.over = Math.max(0, out.used - out.command) + unruly;
  for (const h of party) {
    if (h.id === leader.id || out.over <= 0) continue;
    const step = Math.min(2, steps(ix, leader.alignment, h.alignment));
    const base = out.over * (rules.disobey.stepFactor[step] ?? 1) * moraleFactor(ix, h);
    out.disobey[h.id] = Math.min(rules.disobey.maxChance, rules.disobey.perOver * base);
    const align = rules.desert.align[h.alignment] ?? 1;
    out.desert[h.id] = Math.min(
      rules.desert.maxChance,
      rules.desert.perOver * base * align * desertBy,
    );
  }
  return out;
}

/** Low morale makes a hero likelier to go their own way. */
function moraleFactor(ix: Index, h: Hero): number {
  const m = ix.lib.leadership.morale;
  return Math.max(m.min, Math.min(m.max, 1 + (m.at - h.morale) / m.at));
}

/** What a trip meant for its leader: events that may give a trait. */
export interface LeaderTrip {
  lostSomeone: boolean;
  bigWin: boolean;
  deserted: boolean;
}

/**
 * After a trip the leader came home from (changes the hero): Leadership
 * from the trip, traits fading and new ones from what happened. Returns the
 * traits gained.
 */
export function afterLeading(
  ix: Index,
  leader: Hero,
  trip: LeaderTrip,
  day: number,
  party: string,
  rng: Rng,
): TraitDef[] {
  const rules = ix.lib.leadership;
  const lead: LeaderRecord = (leader.lead ??= { trips: 0, points: 0, streak: 0, traits: [] });
  const before = leadershipOf(ix, leader);
  lead.trips++;
  lead.points += rules.perTrip * (before >= rules.slowAbove ? rules.slowShare : 1);
  // Traits that fade count this trip off.
  for (const t of lead.traits) if (t.left !== undefined) t.left--;
  lead.traits = lead.traits.filter((t) => t.left === undefined || t.left > 0);

  const events: LeaderEvent[] = [];
  if (trip.lostSomeone) {
    lead.streak = 0;
    events.push("lostSomeone");
  } else if (!trip.deserted) {
    lead.streak++;
    if (lead.streak >= rules.streak) {
      lead.streak = 0;
      events.push("longStreak");
    }
  }
  if (trip.bigWin) events.push("bigWin");
  if (trip.deserted) events.push("deserted");

  const gained: TraitDef[] = [];
  for (const ev of events) {
    if (!rng.chance(rules.traitChance[ev] ?? 0)) continue;
    const def = rollTrait(ix, leader, ev, rng);
    if (!def) continue;
    lead.traits = lead.traits.filter((t) => t.id !== def.id);
    lead.traits.push({ id: def.id, day, party, ...(def.trips ? { left: def.trips } : {}) });
    while (lead.traits.length > rules.maxTraits) lead.traits.shift();
    gained.push(def);
  }
  return gained;
}

/** A trait from this event, with odds shaped by the leader's alignment and motivation. */
function rollTrait(ix: Index, leader: Hero, ev: LeaderEvent, rng: Rng): TraitDef | undefined {
  const odds = ix.lib.traits
    .filter((t) => t.from === ev)
    .map((t) => ({
      t,
      w:
        t.weight *
        (t.alignments?.[leader.alignment] ?? 1) *
        (t.motivations?.[leader.motivation] ?? 1),
    }))
    .filter((x) => x.w > 0);
  const total = odds.reduce((s, x) => s + x.w, 0);
  if (!total) return undefined;
  let roll = rng.next() * total;
  return (odds.find((x) => (roll -= x.w) < 0) ?? odds.at(-1)!).t;
}
