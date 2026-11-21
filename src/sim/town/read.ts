/**
 * Reading the town: building effects, prices, wages, warnings. Nothing here changes state.
 */
import type { BuildingEffect, ItemDef, MaterialCost, PostEffect } from "../../content/types";
import { dungeonDay } from "../dungeon";
import { describeParty, partyAlignment } from "../alignment";
import { fatigueTier, heroSheet, inCampClass, type Hero } from "../hero";
import type { Index } from "../library";
import { isLow } from "../morale";
import type { TownState } from "./state";

/** Effects of every working building (damaged ones do nothing until repaired). */
export function effects(ix: Index, town: TownState): BuildingEffect[] {
  const out: BuildingEffect[] = [];
  for (const b of ix.lib.buildings) out.push(...buildingEffects(ix, town, b.id));
  return out;
}

/** What one building is doing for the town right now. */
export function buildingEffects(ix: Index, town: TownState, id: string): readonly BuildingEffect[] {
  const level = town.buildings[id] ?? 0;
  if (level <= 0 || town.damaged.includes(id)) return [];
  return ix.building(id).levels[level - 1]?.effects ?? [];
}

export type Amount = Extract<BuildingEffect, { amount: number }>["type"];

export const total = (ix: Index, town: TownState, type: Amount) =>
  effects(ix, town).reduce((s, e) => s + (e.type === type ? e.amount : 0), 0);

export const partySlots = (ix: Index, town: TownState) => total(ix, town, "partySlots");

/** Heroes the guild can keep. At the mining camp, before the Guild Hall, the opening's campRoster. */
export const rosterSize = (ix: Index, town: TownState) =>
  Math.max(total(ix, town, "rosterSize"), town.camp ? ix.lib.opening.campRoster : 0);

/** Can this hero work a post today? At home, standing, not hurt badly enough to be laid up. */
export const fitForPost = (h: Hero, away: ReadonlySet<string>) =>
  !away.has(h.id) && h.condition === "ok" && h.hp > 0 && !h.injuries?.length;

/** The posts open today: camp-only ones (the seam) close when the opening ends. */
export const openPosts = (ix: Index, town: TownState) =>
  ix.lib.posts.filter((p) => town.camp || !p.campOnly);

/** The heroes working a post (DESIGN.md §8) today: on it, at home and fit. */
export function postWorkers(
  ix: Index,
  town: TownState,
  postId: string,
  away: ReadonlySet<string> = new Set(),
): Hero[] {
  if (!town.camp && ix.post(postId).campOnly) return [];
  return (town.posts?.[postId] ?? [])
    .map((id) => findHero(town, id))
    .filter((h): h is Hero => !!h && fitForPost(h, away));
}

/** Effects of every post, once per hero working it. */
export function postEffects(
  ix: Index,
  town: TownState,
  away: ReadonlySet<string> = new Set(),
): PostEffect[] {
  const out: PostEffect[] = [];
  for (const p of openPosts(ix, town)) {
    const n = postWorkers(ix, town, p.id, away).length;
    for (let i = 0; i < n; i++) out.push(...p.effects);
  }
  return out;
}

/** Overflow strength held back each night: the pit defences, plus heroes on posts. */
export const defence = (ix: Index, town: TownState, away: ReadonlySet<string> = new Set()) =>
  total(ix, town, "defence") +
  postEffects(ix, town, away).reduce((s, e) => s + (e.type === "defence" ? e.amount : 0), 0);

/** How many nights ahead the watchtowers (or a lookout) can see (0 = none). */
export const warningDays = (ix: Index, town: TownState, away: ReadonlySet<string> = new Set()) =>
  [...effects(ix, town), ...postEffects(ix, town, away)].reduce(
    (m, e) => (e.type === "raidWarning" ? Math.max(m, e.days) : m),
    0,
  );

/**
 * The opening (DESIGN.md §8): what still has to be built before parties can
 * go down, as "Guild Hall" or "Palisade level 2". Empty once the camp is held.
 */
export function campNeeds(ix: Index, town: TownState): string[] {
  if (!town.camp) return [];
  return Object.entries(ix.lib.opening.unlock)
    .filter(([id, level]) => (town.buildings[id] ?? 0) < level)
    .map(([id, level]) => `${ix.building(id).name}${level > 1 ? ` level ${level}` : ""}`);
}

export const recruitsToday = (ix: Index, town: TownState) =>
  ix.lib.town.recruitsOnOffer + total(ix, town, "recruitOffers");

export const recruitPicks = (ix: Index, town: TownState) => 1 + total(ix, town, "recruitPicks");

/** Morale every hero in town gets each rest day (the Tavern). */
export const restMorale = (ix: Index, town: TownState) => total(ix, town, "restMorale");

/** XP every hero in town gets each rest day (the Training Yard). */
export const trainingXp = (ix: Index, town: TownState) => total(ix, town, "trainingXp");

/** Extra XP from trips, in percent (the Library). */
export const xpBonus = (ix: Index, town: TownState) => total(ix, town, "xpPercent");

/** Percent of the guild's gold that raiders can't get at (the Vault). */
export const vaultShare = (ix: Index, town: TownState) =>
  Math.min(
    100,
    effects(ix, town).reduce((m, e) => (e.type === "vault" ? Math.max(m, e.amount) : m), 0),
  );

/** A hero's daily wage (content/town.ts). */
export const wage = (ix: Index, h: Hero) =>
  h.porter
    ? ix.lib.town.porters.wage + (h.pay ?? 0)
    : ix.lib.town.wages.base + ix.lib.town.wages.perLevel * h.level + (h.pay ?? 0);

/** What the whole roster costs a day. */
export const wageBill = (ix: Index, town: TownState) =>
  town.camp ? 0 : town.roster.reduce((s, h) => s + wage(ix, h), 0);

/** Whether a building is up and working (built and not damaged). */
export const standing = (town: TownState, id: string) =>
  (town.buildings[id] ?? 0) > 0 && !town.damaged.includes(id);

/** "Does the town have this building standing?", for class requirements. */
export const built = (town: TownState) => (id: string) => standing(town, id);

/**
 * What the next nights at the pit will bring if nobody kills anything, as far
 * ahead as the watchtowers can see. The dungeon has no dice, so this is exact.
 */
export function forecast(ix: Index, town: TownState): { day: number; strength: number }[] {
  const out: { day: number; strength: number }[] = [];
  let d = town.dungeon;
  for (let i = 0; i < warningDays(ix, town); i++) {
    const next = dungeonDay(ix, d);
    d = next.dungeon;
    out.push({ day: town.day + i, strength: next.day.strength });
  }
  return out;
}

/** Gold to repair a raid-damaged building: a share of everything it cost to build. */
export function repairCost(ix: Index, town: TownState, id: string): number {
  const level = town.buildings[id] ?? 0;
  const spent = ix
    .building(id)
    .levels.slice(0, level)
    .reduce((s, l) => s + l.cost, 0);
  return Math.max(5, Math.round(spent * ix.lib.town.repairRate));
}

/** Item ids on sale in town, in shop order. */
export function shopStock(ix: Index, town: TownState): string[] {
  const out: string[] = [];
  for (const e of effects(ix, town)) {
    if (e.type === "sells") for (const id of e.items) if (!out.includes(id)) out.push(id);
  }
  return out;
}

export const buyPrice = (item: ItemDef) => item.value;

/**
 * The guild's best haggler (M6): whoever in town gets the Market to pay most,
 * by Appraisal and CHA (content/town.ts `haggle`). `bonus` is added to the
 * Market's usual rates.
 */
export function haggler(ix: Index, town: TownState): { hero?: Hero; bonus: number } {
  const h = ix.lib.town.haggle;
  let best: { hero?: Hero; bonus: number } = { bonus: 0 };
  for (const x of town.roster) {
    const sheet = heroSheet(ix, x);
    const bonus =
      Math.max(0, (sheet.skills.appraisal ?? 0) - 50) * h.perAppraisal +
      Math.max(0, sheet.stats.CHA - 10) * h.perCha;
    if (bonus > best.bonus) best = { hero: x, bonus };
  }
  return best;
}

/** The share of value the Market pays, after haggling. Never above haggle.max. */
export const marketRate = (ix: Index, base: number, bonus = 0) =>
  Math.min(Math.max(base, ix.lib.town.haggle.max), base + bonus);

/** What the Market pays for one piece of a trip's haul worth `value`. Coins are coins. */
export const haulPrice = (ix: Index, itemId: string, value: number, bonus = 0) =>
  ix.item(itemId).tags.includes("coins")
    ? value
    : Math.max(1, Math.floor(value * marketRate(ix, ix.lib.town.haulRate, bonus)));

export const sellPrice = (ix: Index, item: ItemDef, bonus = 0) =>
  Math.max(1, Math.floor(item.value * marketRate(ix, ix.lib.town.sellRate, bonus)));

const listAnd = (xs: readonly string[]) =>
  xs.length > 1 ? `${xs.slice(0, -1).join(", ")} and ${xs.at(-1)}` : (xs[0] ?? "");

/** Materials in words: "4 iron ore and 3 spider silk". */
export function materialWords(ix: Index, cost: MaterialCost | undefined): string {
  const parts = Object.entries(cost ?? {}).map(
    ([id, n]) => `${n} ${ix.item(id).name.toLowerCase()}`,
  );
  return parts.length > 1
    ? `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}`
    : (parts[0] ?? "");
}

/** What's missing from the store for this cost ("2 iron ore"), or undefined if it's all there. */
export function materialsShort(
  ix: Index,
  town: TownState,
  cost: MaterialCost | undefined,
): string | undefined {
  const short: Record<string, number> = {};
  for (const [id, n] of Object.entries(cost ?? {})) {
    const lack = n - (town.materials?.[id] ?? 0);
    if (lack > 0) short[id] = lack;
  }
  return Object.keys(short).length ? materialWords(ix, short) : undefined;
}

export const findHero = (town: TownState, id: string) => town.roster.find((h) => h.id === id);

export function maxHp(ix: Index, hero: Hero): number {
  return heroSheet(ix, hero).derived.maxHp;
}

/** Things worth knowing before launch. Empty means good to go. */
export function launchWarnings(ix: Index, town: TownState): string[] {
  const out: string[] = [];
  const party = town.party.map((id) => findHero(town, id)).filter((h): h is Hero => !!h);
  for (const h of party) {
    const pct = Math.round((h.hp / maxHp(ix, h)) * 100);
    if (pct < 100) out.push(`${h.name} is only at ${pct}% HP.`);
    const slots = heroSheet(ix, h).derived.carrySlots;
    if (h.pack.length >= slots) out.push(`${h.name}'s pack is full: no room for loot.`);
  }
  if (party.length && !party.some((h) => h.row === "front"))
    out.push("Nobody is in the front row. Monsters will go straight for the back.");
  const aligned = partyAlignment(ix, party);
  if (aligned.divided || aligned.mismatched.length) out.push(describeParty(ix, party));
  if (party.length && !party.some((h) => h.pack.some((id) => ix.item(id).tags.includes("heal"))))
    out.push("Nobody is carrying potions or bandages.");
  for (const h of party) {
    const tier = fatigueTier(ix, h);
    if (tier) out.push(`${h.name} is ${tier.name} (fatigue ${h.fatigue}) and will fight worse.`);
    if (h.levelUps.length) out.push(`${h.name} has a level-up to spend.`);
    if (isLow(ix, h)) {
      const low = ix.motivation(h.motivation).lowMorale;
      const risk = low?.refuseRetreat
        ? " They may refuse to turn back."
        : low?.grabJunk
          ? " They may ignore the loot orders."
          : "";
      out.push(`${h.name} is unhappy (morale ${h.morale}).${risk}`);
    }
  }
  const site = rescueSite(town);
  if (site) {
    const arrive = town.day + site.floor - 1;
    const alive = site.trapped.filter((x) => x.until >= arrive);
    if (town.orders.targetFloor < site.floor)
      out.push(`The rescue needs the party to go down to floor ${site.floor}.`);
    if (site.trapped.length && !alive.length)
      out.push("They can't get there in time to save anyone, but the gear is still there.");
  }
  return out;
}

/** The site the current orders are a rescue run to, if any. */
export const rescueSite = (town: TownState) =>
  town.orders.rescue ? town.sites.find((s) => s.id === town.orders.rescue) : undefined;

/** Things heroes are saying in town: complaints and wishes (DESIGN.md §6, §8). */
export function grumbles(ix: Index, town: TownState): { hero: string; text: string }[] {
  const out: { hero: string; text: string }[] = [];
  for (const h of town.roster) {
    if (isLow(ix, h)) {
      const why = [...h.moraleLog].reverse().find((n) => n.amount < 0)?.reason;
      out.push({
        hero: h.id,
        text: `${h.name} is unhappy${why ? ` (${why})` : ""} and talks about leaving.`,
      });
    }
    if (!standing(town, h.favourite)) {
      const b = ix.building(h.favourite).name;
      const fixing = (town.buildings[h.favourite] ?? 0) > 0;
      out.push({
        hero: h.id,
        text: fixing
          ? `${h.name} wants the ${b} repaired.`
          : `${h.name} keeps asking when we're getting a ${b}.`,
      });
    }
  }
  return out;
}

/** Why the party can't leave yet, or undefined if it can. */
export function cantLaunch(ix: Index, town: TownState): string | undefined {
  const needs = campNeeds(ix, town);
  if (needs.length)
    return `Nobody goes down until the camp is held: build ${listAnd(needs)} first.`;
  if (!town.party.length) return "Pick at least one hero for the party.";
  if (town.party.length > partySlots(ix, town))
    return `The Guild Hall only has room for ${partySlots(ix, town)} in a party.`;
  if ((town.porters ?? []).length > ix.lib.town.porters.slots)
    return `Only ${ix.lib.town.porters.slots} porters can go with one party.`;
  for (const id of [...town.party, ...(town.porters ?? [])]) {
    const h = findHero(town, id);
    if (!h) return "Someone in the party has left the guild.";
    if (h.condition !== "ok" || h.hp <= 0) return `${h.name} can't walk yet. Let them rest.`;
    if (inCampClass(ix, h))
      return `${h.name} is still a miner. Pick a class for them on the roster first.`;
    const inj = h.injuries?.[0];
    if (inj)
      return `${h.name} is laid up with a ${ix.injury(inj.id).name.toLowerCase()} for ${inj.days} more ${inj.days === 1 ? "day" : "days"}. Pick someone else.`;
  }
  return undefined;
}
