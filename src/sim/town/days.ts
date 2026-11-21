/**
 * A day passing in town: the pit at night, morale, quitting, wages and raises.
 */
import { dungeonDay } from "../dungeon";
import { EQUIP_SLOTS, type Hero } from "../hero";
import { gainXp } from "../levels";
import type { Index } from "../library";
import type { HaulItem } from "../loot";
import { applyMorale, type Facts } from "../morale";
import { resolveRaid, type RaidReport } from "../raid";
import { PIT_HISTORY, RAID_HISTORY, type TownState, TownError, newRecord } from "./state";
import {
  defence,
  restMorale,
  trainingXp,
  vaultShare,
  wage,
  standing,
  built,
  findHero,
  rescueSite,
} from "./read";
import { news, book, roll, edit, hero, listWords, gearOf } from "./internal";
import { freshRecruits } from "./start";
import { cancelRescue } from "./parties";
import { buildersWork } from "./buildings";
import { restHero, healInjuries, wasDowned, maybeInjure } from "./wounds";
import { newBody, rise, risenClimb } from "./bodies";
import { checkCamp, raidSpoils, tidyPosts, workPosts } from "./posts";

/**
 * Night falls on day `t.day`: the dungeon breeds and pushes up, and whatever
 * climbs out of the pit meets the defences. Heroes in `away` are out on a
 * trip and can't help. Returns the raid, if anything got past the defences.
 */
export function nightfall(
  ix: Index,
  t: TownState,
  away: ReadonlySet<string>,
): RaidReport | undefined {
  const { dungeon, day } = dungeonDay(ix, t.dungeon);
  t.dungeon = dungeon;
  const targets = ix.lib.buildings
    .filter((b) => !b.raidProof && (t.buildings[b.id] ?? 0) > 0 && !t.damaged.includes(b.id))
    .map((b) => b.id);
  const home = t.roster.filter((h) => !away.has(h.id));
  const raid = roll(t, (rng) =>
    resolveRaid(
      ix,
      {
        day: t.day,
        climbed: day.overflow.count,
        level: day.overflow.level,
        strength: day.strength,
        defence: defence(ix, t, away),
        home,
        // The Vault keeps some of the gold out of reach.
        gold: Math.floor((t.gold * (100 - vaultShare(ix, t))) / 100),
        targets,
      },
      rng,
    ),
  );
  t.pit = [
    ...t.pit,
    {
      day: t.day,
      climbed: raid.climbed,
      level: raid.level,
      strength: raid.strength,
      defence: raid.defence,
      outcome: raid.outcome,
    },
  ].slice(-PIT_HISTORY);
  if (raid.outcome === "held") return undefined;

  // Defenders come back from the fight hurt, or not at all. Those who saw
  // raiders off learn from it.
  const raiderPower = raid.raiders.reduce((s, id) => s + ix.monster(id).power, 0);
  const share = raid.raiders.length ? (raiderPower * raid.kills) / raid.raiders.length : 0;
  const standingDefenders = raid.after.filter((h) => h.condition !== "dead");
  const xpEach = standingDefenders.length
    ? (share * ix.lib.levels.xpPerPower * ix.lib.levels.raidXpShare) / standingDefenders.length
    : 0;
  let died = 0;
  for (const after of raid.after) {
    const i = t.roster.findIndex((h) => h.id === after.id);
    if (i < 0) continue;
    const rec = t.records[after.id];
    if (rec) rec.kills += raid.heroKills[after.id] ?? 0;
    if (after.condition === "dead") {
      died++;
      // The fallen are carried indoors: their gear goes to the store room,
      // their body waits for the Temple or the Graveyard.
      t.stash.push(...gearOf(ix, after).map((g) => g.item));
      t.bodies.push(newBody(t, after, t.day, 0));
      t.memorial.push({
        heroId: after.id,
        name: after.name,
        classId: after.classId,
        day: t.day,
        floor: 0,
        fate: "dead",
        cause: "raid",
        record: rec ?? newRecord(t.day),
      });
      t.roster.splice(i, 1);
      t.party = t.party.filter((id) => id !== after.id);
    } else {
      const h = structuredClone(after);
      const levels = roll(t, (rng) => gainXp(ix, h, xpEach, rng, built(t)));
      if (levels) applyMorale(ix, h, { levelUp: levels }, t.day);
      if (wasDowned(raid.log, h.id)) {
        const inj = maybeInjure(ix, t, h);
        if (inj) {
          applyMorale(ix, h, { injured: 1 }, t.day);
          news(
            t,
            `${h.name} took a ${ix.injury(inj).name.toLowerCase()} defending the town.`,
            "bad",
          );
        }
      }
      t.roster[i] = h;
    }
  }
  if (died) guildFeels(ix, t, { fallenComrades: died }, new Set());
  raidSpoils(ix, t, raid);
  book(t, "stolen", -raid.goldStolen);
  t.damaged = [...t.damaged, ...raid.damaged];
  t.raids = [...t.raids, raid].slice(-RAID_HISTORY);
  return raid;
}

/** A day in town for a hero who isn't away: morale from the town, and training. */
export function dayInTown(ix: Index, t: TownState, h: Hero): void {
  const healed = healInjuries(ix, h);
  if (healed.length)
    news(
      t,
      `${h.name}'s ${listWords(healed)} ${healed.length > 1 ? "have" : "has"} healed.`,
      "good",
    );
  const fav = standing(t, h.favourite);
  applyMorale(
    ix,
    h,
    {
      restDay: 1,
      favouriteBuilt: fav ? 1 : 0,
      favouriteMissing: fav ? 0 : 1,
      restMorale: restMorale(ix, t),
    },
    t.day,
  );
  const xp = trainingXp(ix, t);
  if (xp) {
    const levels = roll(t, (rng) => gainXp(ix, h, xp, rng, built(t)));
    if (levels) {
      applyMorale(ix, h, { levelUp: levels }, t.day);
      news(t, `${h.name} reached level ${h.level} in the Training Yard.`, "good");
    }
  }
}

/** A hero quits: they keep what they're wearing, and leave the rest (DESIGN.md decision 4). */
export function quit(ix: Index, t: TownState, h: Hero): void {
  const took = EQUIP_SLOTS.map((s) => h.equipment[s]).filter((id): id is string => !!id);
  t.stash.push(...h.pack);
  t.roster = t.roster.filter((x) => x.id !== h.id);
  t.party = t.party.filter((id) => id !== h.id);
  t.porters = (t.porters ?? []).filter((id) => id !== h.id);
  t.departed.push({ name: h.name, classId: h.classId, day: t.day, took });
  const gear = took.map((id) => ix.item(id).name.toLowerCase());
  news(
    t,
    `${h.name} has had enough and quits the guild${gear.length ? `, taking their ${listWords(gear)}` : ""}.`,
    "bad",
  );
}

/** Anyone at 0 morale walks out. Returns their names. */
export function quitters(ix: Index, t: TownState): string[] {
  const out: string[] = [];
  for (const h of [...t.roster]) {
    if (h.morale > 0) continue;
    quit(ix, t, h);
    out.push(h.name);
  }
  return out;
}

/** Everyone in town takes a piece of news to heart (deaths, rescues, the abandoned). */
export function guildFeels(
  ix: Index,
  t: TownState,
  facts: Facts,
  except: ReadonlySet<string>,
): void {
  for (const h of t.roster) if (!except.has(h.id)) applyMorale(ix, h, facts, t.day);
}

/**
 * A night passes at the lost parties' sites: the trapped hold on or don't,
 * and monsters carry off what they can.
 */
export function sitesNight(ix: Index, t: TownState): void {
  const rules = ix.lib.rescue;
  for (const site of t.sites) {
    for (const x of site.trapped.filter((x) => x.until < t.day)) {
      site.trapped = site.trapped.filter((y) => y !== x);
      site.items.push(...gearOf(ix, x.hero));
      site.bodies.push(newBody(t, x.hero, t.day, site.floor));
      t.memorial.push({
        heroId: x.hero.id,
        name: x.hero.name,
        classId: x.hero.classId,
        day: t.day,
        floor: site.floor,
        fate: "dead",
        record: t.records[x.hero.id] ?? newRecord(t.day),
      });
      news(t, `Nobody came for ${x.hero.name}. They died waiting on floor ${site.floor}.`, "bad");
      guildFeels(ix, t, { abandoned: 1 }, new Set());
    }
    // The dead who lie too long get up again.
    for (const b of [...site.bodies]) {
      if (b.risen || t.day - b.died < ix.lib.fallen.riseDays) continue;
      site.bodies = site.bodies.filter((x) => x !== b);
      rise(ix, t, site, b);
    }
    const population = t.dungeon.floors[site.floor - 1]?.population ?? 0;
    if (population <= 0 || !site.items.length) continue;
    const kept: HaulItem[] = [];
    for (const it of site.items) {
      if (!roll(t, (rng) => rng.chance(rules.scavengeChance))) {
        kept.push(it);
        continue;
      }
      if (it.keep) {
        t.scavenged.push({
          id: `g${t.nextThingId++}`,
          item: it.item,
          owner: it.owner,
          floor: site.floor,
        });
      }
    }
    site.items = kept;
  }
  t.sites = t.sites.filter((s) => s.trapped.length || s.items.length || s.bodies.length);
  if (t.orders.rescue && !rescueSite(t)) t.orders = cancelRescue(ix, t).orders;
  risenClimb(ix, t);
}

/**
 * Pay the day's wages, in roster order, while the gold lasts. Anyone who
 * can't be paid takes it badly (the "unpaid" morale fact).
 */
export function payWages(ix: Index, t: TownState): void {
  const unpaid: Hero[] = [];
  for (const h of t.roster) {
    const w = wage(ix, h);
    if (t.gold >= w) book(t, "wages", -w);
    else unpaid.push(h);
  }
  if (!unpaid.length) return;
  for (const h of unpaid) applyMorale(ix, h, { unpaid: 1 }, t.day);
  news(t, `The guild couldn't pay ${listWords(unpaid.map((h) => h.name))} today.`, "bad");
}

/**
 * Veterans ask for raises (M6, content/town.ts `raises`). A hero who has
 * gained enough levels since their last raise talk asks; one who's been kept
 * waiting too long takes it as a no.
 */
export function raiseTalk(ix: Index, t: TownState): void {
  const r = ix.lib.town.raises;
  for (const h of t.roster) {
    if (h.raiseAsk) {
      if (t.day - h.raiseAsk.day >= r.patienceDays) {
        h.raiseAsk = undefined;
        h.payLevel = h.level;
        applyMorale(ix, h, { raiseRefused: 1 }, t.day);
        news(t, `${h.name} gave up waiting for an answer about a raise.`, "bad");
      }
      continue;
    }
    if (h.level < (h.payLevel ?? 1) + r.everyLevels) continue;
    const amount = r.amount * (h.motivation === "gold" ? 2 : 1);
    h.raiseAsk = { amount, day: t.day };
    news(t, `${h.name} (level ${h.level}) asks for a raise of ${amount} gold a day.`);
  }
}

/** Say yes or no to a hero's request for a raise. */
export function answerRaise(ix: Index, town: TownState, heroId: string, agree: boolean): TownState {
  const t = edit(town);
  const h = hero(t, heroId);
  if (!h.raiseAsk) throw new TownError(`${h.name} hasn't asked for a raise.`);
  if (agree) h.pay = (h.pay ?? 0) + h.raiseAsk.amount;
  h.raiseAsk = undefined;
  h.payLevel = h.level;
  applyMorale(ix, h, agree ? { raiseGiven: 1 } : { raiseRefused: 1 }, t.day);
  return t;
}

/** The end of a day in town: wages, builders, rest, morale, the lost, and anyone who's had enough. */
export function endOfDay(ix: Index, t: TownState, away: ReadonlySet<string>): void {
  // Anyone already at the end of their tether goes before the day starts.
  quitters(ix, t);
  payWages(ix, t);
  raiseTalk(ix, t);
  t.day += 1;
  buildersWork(ix, t, away);
  workPosts(ix, t, away);
  checkCamp(ix, t);
  for (const h of t.roster) {
    if (away.has(h.id)) continue;
    restHero(ix, h, 1);
    dayInTown(ix, t, h);
  }
  sitesNight(ix, t);
  quitters(ix, t);
  // Nobody who has left the guild stays picked (this also mends saves from
  // before quitting porters were taken off the porter list).
  t.party = t.party.filter((id) => findHero(t, id));
  t.porters = (t.porters ?? []).filter((id) => findHero(t, id));
  tidyPosts(t);
}

/** Spend a day in town. Everyone heals, night falls, and new recruits turn up. */
export function rest(ix: Index, town: TownState, names: readonly string[]): TownState {
  const t = edit(town);
  nightfall(ix, t, new Set());
  endOfDay(ix, t, new Set());
  freshRecruits(ix, t, names);
  return t;
}
