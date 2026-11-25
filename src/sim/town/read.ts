/**
 * Reading the town: building effects, prices, wages, warnings. Nothing here changes state.
 */
import { cantStone } from "./stones";
import { blessingEffects, renownEffects } from "./renown";
import { digEffects } from "./digging";
import type { BuildingEffect, ItemDef, MaterialCost, PostEffect } from "../../content/types";
import { dungeonDay } from "../dungeon";
import { describeParty, partyAlignment } from "../alignment";
import { fatigueTier, heroSheet, inCampClass, type Hero } from "../hero";
import type { Index } from "../library";
import { isLow } from "../morale";
import { partyCommand, type Command } from "../leadership";
import { gearCheck } from "../report";
import { isScouting, isSneaking, lairOf, sealOf, type StandingOrders } from "../expedition";
import { knownLairs, lairSlain } from "../stealth";
import { monsterTier } from "../research";
import { startFloor, tripDays, type ForwardCamp } from "../expedition/clock";
import type { LostSite, Outing, TownState } from "./state";

/**
 * Effects of every working building (damaged ones do nothing until
 * repaired), the guild's Renown ranks, the blessings of the gateways
 * that hold (M8.19) and the working dig sites (M8.20).
 */
export function effects(ix: Index, town: TownState): BuildingEffect[] {
  const out: BuildingEffect[] = [];
  for (const b of ix.lib.buildings) out.push(...buildingEffects(ix, town, b.id));
  out.push(...renownEffects(ix, town), ...blessingEffects(ix, town), ...digEffects(ix, town));
  return out;
}

/** What one building is doing for the town right now. */
export function buildingEffects(ix: Index, town: TownState, id: string): readonly BuildingEffect[] {
  const level = town.buildings[id] ?? 0;
  if (level <= 0 || town.damaged.includes(id) || !willDeal(ix, town, id)) return [];
  return ix.building(id).levels[level - 1]?.effects ?? [];
}

/**
 * A building that only deals with some alignments (the Black Market, DESIGN.md
 * §7) works while the guild has one of them on its books (porters don't count).
 */
export function willDeal(ix: Index, town: TownState, id: string): boolean {
  const deals = ix.building(id).dealsWith;
  return !deals || town.roster.some((h) => !h.porter && deals.includes(h.alignment));
}

export type Amount = Extract<BuildingEffect, { amount: number }>["type"];

export const total = (ix: Index, town: TownState, type: Amount) =>
  effects(ix, town).reduce((s, e) => s + (e.type === type ? e.amount : 0), 0);

/**
 * The party size the Guild Hall plans for: new hires and trained heroes join
 * the next party until it's this big. Not a cap (M7.10): any number can go,
 * and the leader's command (src/sim/leadership.ts) says how well.
 */
export const partySlots = (ix: Index, town: TownState) => total(ix, town, "partySlots");

/** Heroes the guild can keep. At the mining camp, before the Guild Hall, the opening's campRoster. */
export const rosterSize = (ix: Index, town: TownState) =>
  Math.max(total(ix, town, "rosterSize"), town.camp ? ix.lib.opening.campRoster : 0);

/** Can this hero work a post today? At home, standing, not hurt badly enough to be laid up. */
export const fitForPost = (h: Hero, away: ReadonlySet<string>) =>
  !away.has(h.id) && h.condition === "ok" && h.hp > 0 && !h.injuries.length;

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
  return (town.posts[postId] ?? [])
    .map((id) => findHero(town, id))
    .filter((h): h is Hero => !!h && fitForPost(h, away));
}

/**
 * Townsfolk working a post today (M7.15): those put on it, within the slots
 * the heroes at home leave free. Only posts that take settlers.
 */
export function postFolk(
  ix: Index,
  town: TownState,
  postId: string,
  away: ReadonlySet<string> = new Set(),
): number {
  const post = ix.post(postId);
  if (!post.settlers || (!town.camp && post.campOnly)) return 0;
  const room = Math.max(0, post.slots - postWorkers(ix, town, postId, away).length);
  return Math.min(town.folk.jobs[`post:${postId}`] ?? 0, room);
}

/** Effects of every post, once per hero working it (townsfolk add no defence). */
export function postEffects(
  ix: Index,
  town: TownState,
  away: ReadonlySet<string> = new Set(),
): PostEffect[] {
  const out: PostEffect[] = [];
  for (const p of openPosts(ix, town)) {
    const n = postWorkers(ix, town, p.id, away).length;
    for (let i = 0; i < n; i++) out.push(...p.effects);
    const folk = postFolk(ix, town, p.id, away);
    for (let i = 0; i < folk; i++) out.push(...p.effects.filter((e) => e.type !== "defence"));
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

/** Extra days every injury mends for each day in town (the Apothecary). */
export const healingBonus = (ix: Index, town: TownState) => total(ix, town, "healing");

/** Floors the parties ride the cage down past (the Mine Cage). */
export const liftFloors = (ix: Index, town: TownState) =>
  effects(ix, town).reduce((m, e) => (e.type === "lift" ? Math.max(m, e.floors) : m), 0);

/** Percent of the guild's gold that raiders can't get at (the Vault). */
export const vaultShare = (ix: Index, town: TownState) =>
  Math.min(
    100,
    effects(ix, town).reduce((m, e) => (e.type === "vault" ? Math.max(m, e.amount) : m), 0),
  );

/** A hero's daily retainer while at home (content/town.ts, M7.12). */
export const retainer = (ix: Index, h: Hero) =>
  h.porter
    ? ix.lib.town.porters.wage + h.pay
    : ix.lib.town.retainer.base + Math.floor(h.level / ix.lib.town.retainer.levelsPerGold) + h.pay;

/** How many shares of a haul a hero takes (porters take less; raises add more). */
export const shareUnits = (ix: Index, h: Hero) =>
  h.porter ? ix.lib.town.shares.porter : 1 + (h.cut ?? 0);

/** What the roster at home costs a day (those away below draw nothing). */
export const retainerBill = (ix: Index, town: TownState) => {
  if (town.camp) return 0;
  const away = awaySet(town);
  return town.roster.reduce((s, h) => s + (away.has(h.id) ? 0 : retainer(ix, h)), 0);
};

/** Gold the guild owes its heroes for shares it couldn't pay yet. */
export const owedTotal = (town: TownState) => town.roster.reduce((s, h) => s + (h.owed ?? 0), 0);

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
  // A lookout who's down below sees nothing.
  for (let i = 0, n = warningDays(ix, town, awaySet(town)); i < n; i++) {
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
  // A bane (M7.08) is only made once the Library knows the beast well enough.
  return out.filter((id) => {
    const u = ix.item(id).unlock;
    return !u || monsterTier(ix, town, u.monster) >= u.tier;
  });
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

/** Percentage points a fence (the Black Market, DESIGN.md §7) adds to the haul rate. */
export const fence = (ix: Index, town: TownState) => total(ix, town, "fence");

/** Days the unburied dead lie still before they rise (cleansed blessings add to it, M8.19). */
export const riseDays = (ix: Index, town: TownState) =>
  ix.lib.fallen.riseDays + total(ix, town, "riseDelay");

/** What a contract pays now: more as the guild's name spreads (M8.19). */
export const contractReward = (ix: Index, town: TownState, reward: number) =>
  Math.round(reward * (1 + total(ix, town, "contractPay") / 100));

/**
 * What the Market pays for one piece of a trip's haul worth `value`. Coins
 * are coins. `fenced` is percentage points from fence() on the base rate.
 */
export const haulPrice = (ix: Index, itemId: string, value: number, bonus = 0, fenced = 0) =>
  ix.item(itemId).tags.includes("coins")
    ? value
    : Math.max(1, Math.floor(value * marketRate(ix, ix.lib.town.haulRate + fenced / 100, bonus)));

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
    const lack = n - (town.materials[id] ?? 0);
    if (lack > 0) short[id] = lack;
  }
  return Object.keys(short).length ? materialWords(ix, short) : undefined;
}

export const findHero = (town: TownState, id: string) => town.roster.find((h) => h.id === id);

export function maxHp(ix: Index, hero: Hero): number {
  return heroSheet(ix, hero).derived.maxHp;
}

/** Things worth knowing before launch. Empty means good to go. */
/** The next party's command (M7.05): who leads, and how far their command stretches. */
export function nextCommand(ix: Index, town: TownState): Command {
  const party = town.party.map((id) => findHero(town, id)).filter((h): h is Hero => !!h);
  return partyCommand(ix, party, town.leader);
}

/** 4.5 as "4.5", 4 as "4". */
export const fmtCommand = (n: number) => String(Math.round(n * 10) / 10);

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
  // The gear check (M7.06): the details are in the scouting report.
  const gear = gearCheck(ix, town.orders.targetFloor, party);
  if (gear.length) {
    const names = [...new Set(gear.map((g) => g.hero))].map((id) => findHero(town, id)!.name);
    out.push(
      `Gear check: ${listAnd(names)} ${names.length === 1 ? "is" : "are"} under-geared for floor ${town.orders.targetFloor}. The scouting report says why.`,
    );
  }
  // Command (M7.05): over it, the party is unruly.
  const cmd = nextCommand(ix, town);
  if (cmd.leader && cmd.over > 0) {
    const risky = party
      .filter((h) => (cmd.disobey[h.id] ?? 0) >= 0.1)
      .sort((a, b) => (cmd.disobey[b.id] ?? 0) - (cmd.disobey[a.id] ?? 0))
      .map((h) => h.name);
    out.push(
      `The party needs ${fmtCommand(cmd.used)} command and ${cmd.leader.name} has ${cmd.command}: ` +
        `it's unruly, so orders may be ignored${risky.length ? `, most likely by ${listAnd(risky)}` : ""}, ` +
        `and someone may desert before a bad fight.`,
    );
  }
  const grudges = party.flatMap((h) =>
    (h.grudges ?? [])
      .filter((id) => party.some((x) => x.id === id))
      .map(
        (id) => `${h.name} won't forgive ${party.find((x) => x.id === id)!.name} for deserting.`,
      ),
  );
  out.push(...grudges);
  const aligned = partyAlignment(ix, party);
  if (aligned.divided || aligned.mismatched.length) out.push(describeParty(ix, party));
  // Holy and unholy gear (DESIGN.md §7): Good heroes hate carrying cursed things.
  for (const h of party) {
    const unholy = Object.values(h.equipment).filter(
      (id): id is string => !!id && ix.item(id).tags.includes("unholy"),
    );
    if (unholy.length && h.alignment === "good")
      out.push(
        `${h.name} is Good and hates carrying the ${unholy.map((id) => ix.item(id).name).join(" and ")}: they'll lose morale.`,
      );
  }
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
  const target = rescueTarget(town);
  const floor = searchFloor(town);
  if (target && floor && town.orders.targetFloor < floor)
    out.push(`The search needs the party to go down to floor ${floor}.`);
  const site = rescueSite(town);
  if (site && !site.unknown) {
    const arrive = town.day + site.floor - 1;
    const alive = site.trapped.filter((x) => x.until >= arrive);
    if (site.trapped.length && !alive.length)
      out.push(
        "They're unlikely to get there in time to save anyone, but the gear is still there.",
      );
    if (site.visitor) out.push("Another party is already on its way there.");
  }
  if (target && town.orders.mission === "rescue" && site?.bodies.length && !site.unknown)
    out.push("A rescue party comes back for the living only: the dead and the gear stay there.");
  return out;
}

/**
 * What the current orders are a search for (DESIGN.md §17.3): a lost
 * party's site, or a party that's out and overdue (with the site the town
 * doesn't know about yet, if it fell). Undefined: an ordinary trip.
 */
export function rescueTarget(town: TownState): { site?: LostSite; outing?: Outing } | undefined {
  const id = town.orders.rescue;
  if (!id) return undefined;
  const site = town.sites.find((s) => s.id === id);
  if (site) return { site };
  const outing = town.outings.find((o) => o.id === id);
  if (!outing) return undefined;
  return { outing, site: town.sites.find((s) => s.outing === outing.id) };
}

/** The site the current orders are a search for, if the town knows of it. */
export const rescueSite = (town: TownState) => {
  const site = rescueTarget(town)?.site;
  return site && !site.outing ? site : undefined;
};

/**
 * The floor a search has to reach: the site's, if the town knows where it
 * is, else the floor the missing party was heading for.
 */
export function searchFloor(town: TownState): number | undefined {
  const target = rescueTarget(town);
  if (!target) return undefined;
  if (target.outing) return target.outing.result.orders.targetFloor;
  const s = target.site!;
  return s.unknown ? (s.heading ?? s.floor) : s.floor;
}

// ---------------------------------------------------------------------------
// Parties out in the dungeon (M7.02)
// ---------------------------------------------------------------------------

/** The party a hero is out with, if they're away. */
export const outingOf = (town: TownState, heroId: string) =>
  town.outings.find((o) => o.heroes.includes(heroId) || o.porters.includes(heroId));

/** Everyone out in the dungeon. */
export const awaySet = (town: TownState): Set<string> =>
  new Set(town.outings.flatMap((o) => [...o.heroes, ...o.porters]));

/**
 * How a party that's out looks from town (DESIGN.md §17.3): only the clock
 * and the expected day back. "overdue" from the day after, "lost" (possibly
 * lost) a day or two later.
 */
export function outingStatus(ix: Index, town: TownState, o: Outing): "out" | "overdue" | "lost" {
  const late = town.day - o.expected;
  if (late >= ix.lib.rescue.lostDays) return "lost";
  if (late >= ix.lib.rescue.overdueDays) return "overdue";
  return "out";
}

/**
 * Hours a trip usually takes, from the orders alone (DESIGN.md §17.2): the
 * floors' rooms at their usual length, there and back, plus hunting. Never
 * from what actually happens, so it can't give the outcome away.
 */
export function usualHours(
  ix: Index,
  orders: StandingOrders,
  lift = 0,
  camp?: ForwardCamp,
): number {
  const time = ix.lib.time;
  const target = orders.targetFloor;
  const start = startFloor(target, lift, camp);
  const first = start.first;
  const roomHours = (r: (typeof ix.lib.rooms)[number]) =>
    (r.hours ?? time.room) +
    (time.behaviours[r.behaviour] ?? 0) +
    (r.behaviour === "fight" ? time.fight.hours : 0);
  let hours = 2 * time.cagePerFloor * start.cage + 2 * (camp?.path ?? 0) * start.path;
  if (start.camp) hours += time.campHours;
  for (let depth = first; depth <= target; depth++) {
    const floor = ix.floor(depth);
    const fixed = (floor.fixedRooms ?? []).map((id) => ix.room(id));
    const options = ix.lib.rooms.filter(
      (r) => depth >= r.floors[0] && depth <= r.floors[1] && !fixed.some((f) => f.id === r.id),
    );
    const weight = options.reduce((a, r) => a + r.weight, 0) || 1;
    const usual = options.reduce((a, r) => a + roomHours(r) * r.weight, 0) / weight;
    const count = (floor.rooms[0] + floor.rooms[1]) / 2;
    hours += time.stairs + (count - fixed.length) * usual;
    hours += fixed.reduce((a, r) => a + roomHours(r), 0);
    hours += time.climbPerFloor;
  }
  // Hunting: about one side tunnel and fight for every couple of monsters to kill.
  const pct = orders.clearPercent ?? 0;
  if (pct > 0 && !orders.rescue && !isScouting(orders) && !isSneaking(orders)) {
    const floor = ix.floor(target);
    const tunnels = Math.min(
      ix.lib.dungeon.hunting.maxRooms,
      Math.ceil(((floor.capacity ?? 0) * pct) / 100 / 2.5),
    );
    hours += tunnels * (time.hunt + time.fight.hours);
  }
  // Sealing the stairs (M7.16).
  const seal = sealOf(orders);
  if (seal && target < ix.lib.floors.length) hours += ix.barricade(seal).hours;
  return hours;
}

/** Days a trip with these orders usually takes (see usualHours). */
export const usualDays = (ix: Index, orders: StandingOrders, lift = 0, camp?: ForwardCamp) =>
  tripDays(ix.lib.time.startHour, usualHours(ix, orders, lift, camp));

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
  if (town.porters.length > ix.lib.town.porters.slots)
    return `Only ${ix.lib.town.porters.slots} porters can go with one party.`;
  for (const id of [...town.party, ...town.porters]) {
    const h = findHero(town, id);
    if (!h) return "Someone in the party has left the guild.";
    const out = outingOf(town, id);
    if (out) return `${h.name} is away with ${out.name}.`;
    if (h.condition !== "ok" || h.hp <= 0) return `${h.name} can't walk yet. Let them rest.`;
    if (inCampClass(ix, h))
      return `${h.name} is still a miner. Pick a class for them on the roster first.`;
    const inj = h.injuries[0];
    if (inj)
      return `${h.name} is laid up with a ${ix.injury(inj.id).name.toLowerCase()} for ${inj.days} more ${inj.days === 1 ? "day" : "days"}. Pick someone else.`;
  }
  // Lairs (M7.08): only ones scouts have found, on the floor the party is going to.
  const lair = lairOf(town.orders);
  if (isSneaking(town.orders) && !lair) return "Pick a lair for the sneak party to go into.";
  if (lair) {
    const def = ix.lair(lair);
    if (!knownLairs(ix, town).some((l) => l.id === lair))
      return `Nobody knows the way to ${def.name.replace(/^The /, "the ")} yet. Send scouts to floor ${def.floor} first.`;
    if (town.orders.targetFloor !== def.floor)
      return `${def.name} is on floor ${def.floor}: send the party to floor ${def.floor}.`;
    if (lairSlain(town, lair) && isSneaking(town.orders))
      return `The ${ix.monster(def.monster).name} is dead: there's nothing to sneak past.`;
  }
  return cantSeal(ix, town, town.orders) ?? cantStone(ix, town, town.orders);
}

/**
 * Why the party can't carry this seal down (M7.16), or undefined if it can
 * (or isn't sealing anything).
 */
export function cantSeal(ix: Index, town: TownState, orders: StandingOrders): string | undefined {
  const id = sealOf(orders);
  if (!id) return undefined;
  const b = ix.barricade(id);
  if (orders.targetFloor >= ix.lib.floors.length)
    return `Floor ${orders.targetFloor} is the bottom: there are no stairs below it to seal.`;
  if (town.dungeon.stones[orders.targetFloor])
    return `The stairs below floor ${orders.targetFloor} are held by a Seal Stone's gateway.`;
  const short = materialsShort(ix, town, b.materials);
  if (short) return `The ${b.name.toLowerCase()} needs ${short} more.`;
  if (town.gold < (b.gold ?? 0)) return `The ${b.name.toLowerCase()} costs ${b.gold} gold.`;
  return undefined;
}
