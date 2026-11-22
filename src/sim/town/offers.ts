/**
 * Town news (M7.17, DESIGN.md §18.1c): offers that turn up in town, want an
 * answer, and go away again. Content in content/offers/, rules in
 * content/offers.ts.
 *
 * - A caravan buys spare materials (nobody else in town does) and sells a
 *   few things the Market doesn't, for a couple of days.
 * - A contract wants materials by a day, for gold: take it on, then deliver.
 * - A petition from the townsfolk costs gold and does some good.
 * - A visitor, a hero passing through, joins free and kitted if their
 *   favourite building is standing.
 *
 * Offers roll on their own random stream (town.offerSeed), so they never
 * change the town's other dice. Each one that turns up is news, so "Wait
 * until someone's back" stops for it, and for a contract's last day.
 */
import type { OfferDef, PetitionEffect } from "../../content/types";
import { baseClasses, createHero } from "../hero";
import type { Index } from "../library";
import { applyMorale } from "../morale";
import { createRng, type Rng } from "../rng";
import { type Offer, type TownState, TownError, newRecord } from "./state";
import { awaySet, materialsShort, materialWords, partySlots, rosterSize, standing } from "./read";
import { addMaterials, book, edit, news, useMaterials } from "./internal";
import { pickName } from "./start";
import { folkOf, housing } from "./folk";

/** Roll on the offers' own stream (changes `t`). */
function offerRoll<T>(t: TownState, use: (rng: Rng) => T): T {
  const rng = createRng(t.offerSeed ?? (t.seed ^ 0x5bd1e995) >>> 0);
  const out = use(rng);
  t.offerSeed = rng.int(0, 2 ** 31 - 1);
  return out;
}

export const offersOf = (town: TownState): Offer[] => town.offers ?? [];

const offerDef = (ix: Index, o: Offer): OfferDef => ix.offer(o.def);

/** Could this offer turn up today? */
function canTurnUp(t: TownState, def: OfferDef): boolean {
  if (def.minDay && t.day < def.minDay) return false;
  if (def.needs && !standing(t, def.needs)) return false;
  if (def.kind === "petition" && def.minFolk && folkOf(t).count < def.minFolk) return false;
  return !offersOf(t).some((o) => o.def === def.id);
}

/** A hero for a visitor offer: the best of `picks` rolls, kitted. */
function visitorHero(ix: Index, t: TownState, def: OfferDef, names: readonly string[]) {
  if (def.kind !== "visitor") return undefined;
  return offerRoll(t, (rng) => {
    const classes = def.classes?.length ? def.classes : baseClasses(ix).map((c) => c.id);
    const classId = rng.pick(classes);
    const id = `h${t.nextHeroId++}`;
    const name = pickName(t, names, rng);
    const main = ix.cls(classId).mainStats;
    const score = (h: ReturnType<typeof createHero>) => main.reduce((s, st) => s + h.stats[st], 0);
    let best = createHero(ix, { id, name, classId }, rng);
    for (let i = 1; i < def.picks; i++) {
      const other = createHero(ix, { id, name, classId }, rng);
      if (score(other) > score(best)) best = other;
    }
    return best;
  });
}

/**
 * The offers' day (after the day moves on, changes `t`): old ones go, a
 * contract on its last day says so, and something new may turn up.
 */
export function offersDay(ix: Index, t: TownState, names: readonly string[]): void {
  if (t.camp) return;
  const keep: Offer[] = [];
  for (const o of offersOf(t)) {
    const def = offerDef(ix, o);
    if (t.day > o.until) {
      if (o.taken) news(t, `The "${def.name}" contract ran out before it was delivered.`, "bad");
      continue;
    }
    if (o.taken && t.day === o.until && def.kind === "contract")
      news(
        t,
        `Last day for the "${def.name}" contract: ${materialWords(ix, def.wants)} for ${def.reward} gold.`,
      );
    keep.push(o);
  }
  t.offers = keep;
  const rules = ix.lib.offerRules;
  if (keep.length >= rules.max) return;
  const def = offerRoll(t, (rng) => {
    if (!rng.chance(rules.chancePerDay)) return undefined;
    const options = (ix.lib.offers ?? []).filter((d) => canTurnUp(t, d));
    if (!options.length) return undefined;
    let pick = rng.next() * options.reduce((s, d) => s + d.weight, 0);
    return options.find((d) => (pick -= d.weight) < 0) ?? options.at(-1)!;
  });
  if (!def) return;
  const hero = visitorHero(ix, t, def, names);
  const o: Offer = {
    id: `x${t.nextThingId++}`,
    def: def.id,
    day: t.day,
    until: t.day + def.days - 1,
    ...(hero ? { hero } : {}),
  };
  t.offers = [...keep, o];
  news(t, offerHeadline(ix, o));
}

/** The line the town hears when an offer turns up. */
export function offerHeadline(ix: Index, o: Offer): string {
  const def = offerDef(ix, o);
  if (def.kind === "visitor" && o.hero)
    return `${o.hero.name}, a ${ix.cls(o.hero.classId).name.toLowerCase()}, ${def.text} (They'd stay for a ${ix.building(o.hero.favourite).name}.)`;
  if (def.kind === "contract")
    return `${def.text} ${materialWords(ix, def.wants)} for ${def.reward} gold, within ${def.deadline} days.`;
  return def.text;
}

/** Find an offer still waiting in the copy `t`. */
function find(t: TownState, offerId: string): Offer {
  const o = offersOf(t).find((x) => x.id === offerId);
  if (!o) throw new TownError("That's gone.");
  return o;
}

const drop = (t: TownState, o: Offer) => {
  t.offers = offersOf(t).filter((x) => x !== o);
};

/** Turn an offer away. A contract already taken on can't be: it runs out. */
export function dismissOffer(_ix: Index, town: TownState, offerId: string): TownState {
  const t = edit(town);
  const o = find(t, offerId);
  if (o.taken) throw new TownError("The guild gave its word on that one.");
  drop(t, o);
  return t;
}

// ---------------------------------------------------------------------------
// Caravans
// ---------------------------------------------------------------------------

/** Sell `n` of a material to a caravan. */
export function sellToCaravan(
  ix: Index,
  town: TownState,
  offerId: string,
  material: string,
  n: number,
): TownState {
  const t = edit(town);
  const def = offerDef(ix, find(t, offerId));
  if (def.kind !== "caravan") throw new TownError("They aren't buying.");
  const price = def.buys[material];
  if (!price) throw new TownError("They don't want that.");
  if (!Number.isInteger(n) || n < 1) throw new TownError("That isn't a number of things.");
  useMaterials(t, { [material]: n });
  book(t, "trade", price * n);
  return t;
}

/** Buy the caravan's `index`th item (one of each). */
export function buyFromCaravan(
  ix: Index,
  town: TownState,
  offerId: string,
  index: number,
): TownState {
  const t = edit(town);
  const o = find(t, offerId);
  const def = offerDef(ix, o);
  if (def.kind !== "caravan") throw new TownError("They aren't selling.");
  const ware = def.sells[index];
  if (!ware || o.bought?.includes(index)) throw new TownError("They've sold that.");
  if (t.gold < ware.price) throw new TownError("Not enough gold.");
  book(t, "trade", -ware.price);
  t.stash.push(ware.item);
  o.bought = [...(o.bought ?? []), index];
  return t;
}

// ---------------------------------------------------------------------------
// Contracts
// ---------------------------------------------------------------------------

/** Take a contract on: the deadline starts now. */
export function takeContract(ix: Index, town: TownState, offerId: string): TownState {
  const t = edit(town);
  const o = find(t, offerId);
  const def = offerDef(ix, o);
  if (def.kind !== "contract") throw new TownError("That isn't a contract.");
  if (o.taken) throw new TownError("The guild has already taken it on.");
  o.taken = true;
  // Today counts: a 10-day contract taken on day 5 is due by the end of day 14.
  o.until = t.day + def.deadline - 1;
  return t;
}

/** Why a contract can't be delivered now, or undefined if it can. */
export function cantDeliver(ix: Index, town: TownState, offerId: string): string | undefined {
  const o = offersOf(town).find((x) => x.id === offerId);
  if (!o) return "That's gone.";
  const def = offerDef(ix, o);
  if (def.kind !== "contract") return "That isn't a contract.";
  const short = materialsShort(ix, town, def.wants);
  return short ? `Still short of ${short}.` : undefined;
}

/** Deliver a contract: the materials go, the gold comes. */
export function deliverContract(ix: Index, town: TownState, offerId: string): TownState {
  const why = cantDeliver(ix, town, offerId);
  if (why) throw new TownError(why);
  const t = edit(town);
  const o = find(t, offerId);
  const def = offerDef(ix, o);
  if (def.kind !== "contract") throw new TownError("That isn't a contract.");
  useMaterials(t, def.wants);
  book(t, "contracts", def.reward);
  drop(t, o);
  news(t, `The guild delivered on "${def.name}" and was paid ${def.reward} gold.`, "good");
  return t;
}

// ---------------------------------------------------------------------------
// Petitions
// ---------------------------------------------------------------------------

/** Why a petition can't be granted now, or undefined if it can. */
export function cantGrant(ix: Index, town: TownState, offerId: string): string | undefined {
  const o = offersOf(town).find((x) => x.id === offerId);
  if (!o) return "That's gone.";
  const def = offerDef(ix, o);
  if (def.kind !== "petition") return "That isn't a petition.";
  if (town.gold < def.gold) return "Not enough gold.";
  const short = materialsShort(ix, town, def.materials);
  if (short) return `Short of ${short}.`;
  if (def.effect.type === "folk" && folkOf(town).count >= housing(ix, town))
    return "The Cottages are full: there's nowhere for them to live.";
  return undefined;
}

/** What a petition does, in words. */
export function petitionWords(ix: Index, e: PetitionEffect): string {
  switch (e.type) {
    case "folk":
      return `${e.count} more settlers (if there's room)`;
    case "food":
      return `${e.amount} food into the store`;
    case "morale":
      return `+${e.amount} morale for every hero at home`;
    case "materials":
      return materialWords(ix, e.materials);
  }
}

/** Grant a petition: pay for it, and it does its good. */
export function grantPetition(ix: Index, town: TownState, offerId: string): TownState {
  const why = cantGrant(ix, town, offerId);
  if (why) throw new TownError(why);
  const t = edit(town);
  const o = find(t, offerId);
  const def = offerDef(ix, o);
  if (def.kind !== "petition") throw new TownError("That isn't a petition.");
  book(t, "petitions", -def.gold);
  useMaterials(t, def.materials);
  const e = def.effect;
  if (e.type === "folk") {
    const folk = folkOf(t);
    const n = Math.min(e.count, housing(ix, t) - folk.count);
    t.folk = { ...folk, count: folk.count + n };
  } else if (e.type === "food") {
    const folk = folkOf(t);
    t.folk = { ...folk, food: Math.min(ix.lib.townsfolk.foodStore, folk.food + e.amount) };
  } else if (e.type === "morale") {
    const away = awaySet(t);
    for (const h of t.roster)
      if (!away.has(h.id)) applyMorale(ix, h, { townTreat: e.amount }, t.day);
  } else addMaterials(t, e.materials);
  drop(t, o);
  news(t, `The guild granted "${def.name}": ${petitionWords(ix, e)}.`, "good");
  return t;
}

// ---------------------------------------------------------------------------
// Visitors
// ---------------------------------------------------------------------------

/** Why a visitor won't join now, or undefined if they will. */
export function cantWelcome(ix: Index, town: TownState, offerId: string): string | undefined {
  const o = offersOf(town).find((x) => x.id === offerId);
  if (!o?.hero) return "They've moved on.";
  if (!standing(town, o.hero.favourite))
    return `${o.hero.name} would only stay for a ${ix.building(o.hero.favourite).name}.`;
  if (town.roster.length >= rosterSize(ix, town))
    return "The roster is full. Upgrade the Guild Hall or dismiss someone.";
  return undefined;
}

/** A visitor joins the guild, free, with their kit. */
export function welcomeVisitor(ix: Index, town: TownState, offerId: string): TownState {
  const why = cantWelcome(ix, town, offerId);
  if (why) throw new TownError(why);
  const t = edit(town);
  const o = find(t, offerId);
  const h = o.hero!;
  t.roster.push(h);
  t.records[h.id] = newRecord(t.day);
  if (t.party.length < partySlots(ix, t)) t.party.push(h.id);
  drop(t, o);
  news(t, `${h.name} has joined the guild.`, "good");
  return t;
}
