/**
 * A day passing in town: the pit at night, morale, quitting, pay (pay.ts) and raises.
 */
import { applyKills, dungeonDay } from "../dungeon";
import { breakOut, holedNight } from "../expedition";
import { EQUIP_SLOTS, type Hero } from "../hero";
import { gainXp } from "../levels";
import type { Index } from "../library";
import type { HaulItem } from "../loot";
import { applyMorale, type Facts } from "../morale";
import { resolveRaid, type RaidReport } from "../raid";
import {
  PIT_HISTORY,
  RAID_HISTORY,
  type LostSite,
  type TownState,
  TownError,
  newRecord,
} from "./state";
import {
  defence,
  restMorale,
  healingBonus,
  riseDays,
  trainingXp,
  vaultShare,
  standing,
  built,
  findHero,
  awaySet,
  rescueTarget,
} from "./read";
import { news, book, roll, edit, hero, listWords, gearOf } from "./internal";
import { freshRecruits } from "./start";
import { cancelRescue } from "./parties";
import { buildersWork } from "./buildings";
import { restHero, healInjuries, wasDowned, maybeInjure } from "./wounds";
import { newBody, rise, risenClimb } from "./bodies";
import { checkCamp, raidSpoils, tidyPosts, workPosts } from "./posts";
import { researchTiers, studyDay, tidyDesks } from "./research";
import { payDay } from "./pay";
import { sealsBroke } from "./seals";
import { gatewayNews } from "./gateways";
import { boundSeals } from "./renown";
import { digDay } from "./digs";
import { storyDay } from "./story";
import { offersDay } from "./offers";
import { folkDay, folkScared } from "./folk";
import { tidyBenches, workshopDay } from "./workshops";
import { arrivals, landKills, launch } from "./launch";
import { hearOfLoss } from "./lost";
import { remember, returnHero } from "./homecoming";

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
  sealsBroke(t, day.broke);
  gatewayNews(ix, t, day);
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
        research: researchTiers(ix, t),
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
  folkScared(ix, t, raid);

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
  const healed = healInjuries(ix, h, healingBonus(ix, t));
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
      boundSeals: boundSeals(ix, t),
    },
    t.day,
  );
  // Porters (M6) don't drill: they have no class to level up in yet.
  const xp = h.porter || h.untrained ? 0 : trainingXp(ix, t);
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
  t.porters = t.porters.filter((id) => id !== h.id);
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
  const away = awaySet(t);
  for (const h of [...t.roster]) {
    if (h.morale > 0 || away.has(h.id)) continue;
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
  // Those out in the dungeon hear it when they're back (M7.02).
  const away = awaySet(t);
  for (const h of t.roster)
    if (!except.has(h.id) && !away.has(h.id)) applyMorale(ix, h, facts, t.day);
}

/**
 * A night passes at the lost parties' sites: the trapped hold on or don't,
 * and monsters carry off what they can.
 */
export function sitesNight(ix: Index, t: TownState): void {
  const rules = ix.lib.rescue;
  for (const site of [...t.sites]) {
    // A party is on its way here: the site waits for it (M7.02).
    if (site.visitor && t.outings.some((o) => o.id === site.visitor)) continue;
    site.visitor = undefined;
    // Nobody in town knows about this yet (M7.02): no news, no grief.
    const hidden = !!site.outing;
    if (site.holed && site.trapped.length) holdingOut(ix, t, site);
    for (const x of site.trapped.filter((x) => x.until < t.day)) {
      site.trapped = site.trapped.filter((y) => y !== x);
      diesAtSite(ix, t, site, x.hero);
      if (hidden || site.unknown) continue;
      news(t, `Nobody came for ${x.hero.name}. They died waiting on floor ${site.floor}.`, "bad");
      guildFeels(ix, t, { abandoned: 1 }, new Set());
    }
    // The dead who lie too long get up again: riseDays after they died, and
    // the town always gets that long after it hears to fetch them (M7.02).
    const since = (b: { died: number }) => t.day - Math.max(b.died, site.heard ?? 0);
    // With the heart shut off (M8.22), nothing pushes life into them: they lie still.
    for (const b of [...site.bodies]) {
      if (hidden || b.risen || t.dungeon.core.shut || since(b) < riseDays(ix, t)) continue;
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
  t.sites = t.sites.filter(
    (s) => s.trapped.length || s.items.length || s.bodies.length || s.outing,
  );
  if (t.orders.rescue && !rescueTarget(t)) t.orders = cancelRescue(ix, t).orders;
  risenClimb(ix, t);
}

/**
 * Someone dies at a lost party's site: their body and gear lie there. The
 * memorial says so if the town knows of the site (if it only knows they're
 * missing, they stay on it as lost).
 */
function diesAtSite(ix: Index, t: TownState, site: LostSite, h: Hero): void {
  site.items.push(...gearOf(ix, h));
  site.bodies.push(newBody(t, h, t.day, site.floor));
  if (site.outing) return;
  remember(t, {
    heroId: h.id,
    name: h.name,
    classId: h.classId,
    day: t.day,
    floor: site.unknown ? (site.heading ?? site.floor) : site.floor,
    fate: site.unknown ? "lost" : "dead",
    record: t.records[h.id] ?? newRecord(t.day),
  });
}

/**
 * A night for a party holed up below (M7.02, DESIGN.md §17.3): they patch
 * each other up, and monsters may find the barricade. Once they're fit to
 * walk, or the food runs out, they try for home on their own.
 */
function holdingOut(ix: Index, t: TownState, site: LostSite): void {
  const heroes = site.trapped.map((x) => x.hero);
  const night = roll(t, (rng) =>
    holedNight(ix, heroes, site.floor, t.dungeon.floors, rng.int(0, 2 ** 31 - 1)),
  );
  t.dungeon = applyKills(t.dungeon, night.floorKills);
  const hidden = !!site.outing;
  const until = site.trapped[0]!.until;
  const fell: Hero[] = [];
  for (const x of site.trapped) {
    const h = night.party.find((p) => p.id === x.hero.id)!;
    x.hero = h;
    if (night.wiped || h.condition === "dead") fell.push(h);
  }
  if (fell.length) {
    site.trapped = site.trapped.filter((x) => !fell.includes(x.hero));
    for (const h of fell) diesAtSite(ix, t, site, h);
    if (!hidden && !site.unknown)
      news(
        t,
        `Monsters found the barricade on floor ${site.floor}. ${listWords(fell.map((h) => h.name))} fell.`,
        "bad",
      );
  }
  if (!site.trapped.length || !(night.ready || until <= t.day)) return;

  // Make a break for it.
  const out = roll(t, (rng) =>
    breakOut(
      ix,
      site.trapped.map((x) => x.hero),
      site.floor,
      t.dungeon.floors,
      rng.int(0, 2 ** 31 - 1),
    ),
  );
  t.dungeon = applyKills(t.dungeon, out.floorKills);
  const lost = t.outings.find((o) => o.id === site.outing);
  const home = out.outcome === "wiped" ? [] : out.party.filter((h) => h.condition !== "dead");
  const died = out.party.filter((h) => !home.includes(h));
  site.trapped = [];
  site.holed = undefined;
  if (out.wipeSite) site.floor = out.wipeSite.floor;
  for (const h of died) diesAtSite(ix, t, site, h);
  if (!home.length) return;
  // The survivors know what happened: the town hears it from them.
  if (lost) hearOfLoss(ix, t, lost, "home", new Set(home.map((h) => h.id)));
  site.unknown = undefined;
  for (const h of home) {
    returnHero(t, h);
    applyMorale(ix, findHero(t, h.id)!, { wasTrapped: 1 }, t.day);
  }
  const days = t.day - site.day;
  news(
    t,
    `${listWords(home.map((h) => h.name))} ${home.length > 1 ? "have" : "has"} fought their way home ` +
      `after ${days} ${days === 1 ? "day" : "days"} holed up on floor ${site.floor}` +
      `${died.length ? `. ${listWords(died.map((h) => h.name))} didn't make it` : ""}.`,
    died.length ? "bad" : "good",
  );
}

/**
 * Veterans ask for raises (M6, content/town.ts `raises`). A hero who has
 * gained enough levels since their last raise talk asks; one who's been kept
 * waiting too long takes it as a no. Only days in town count: a hero away in
 * the dungeon neither asks nor runs out of patience, so the player always gets
 * `patienceDays` days between trips to answer.
 */
export function raiseTalk(ix: Index, t: TownState, away: ReadonlySet<string> = new Set()): void {
  const r = ix.lib.town.raises;
  for (const h of t.roster) {
    if (away.has(h.id)) continue;
    if (h.raiseAsk) {
      const waited = (h.raiseAsk.waited ?? 0) + 1;
      h.raiseAsk = { ...h.raiseAsk, waited };
      if (waited >= r.patienceDays) {
        h.raiseAsk = undefined;
        h.payLevel = h.level;
        applyMorale(ix, h, { raiseRefused: 1 }, t.day);
        news(t, `${h.name} gave up waiting for an answer about a raise.`, "bad");
      }
      continue;
    }
    if (h.level < (h.payLevel ?? 1) + r.everyLevels) continue;
    // Gold heroes want a bigger cut of the haul (M7.12); the rest a bigger retainer.
    if (h.motivation === "gold" && !h.porter) {
      h.raiseAsk = { amount: r.share, day: t.day, waited: 0, kind: "share" };
      news(t, `${h.name} (level ${h.level}) asks for ${raiseWords(h.raiseAsk)}.`);
      continue;
    }
    h.raiseAsk = { amount: r.amount, day: t.day, waited: 0 };
    news(t, `${h.name} (level ${h.level}) asks for ${raiseWords(h.raiseAsk)}.`);
  }
}

/** "a raise of 1 gold a day", "half a share more of every haul". */
export function raiseWords(ask: NonNullable<Hero["raiseAsk"]>): string {
  if (ask.kind !== "share") return `a raise of ${ask.amount} gold a day`;
  const n = ask.amount === 0.5 ? "half a share" : `${ask.amount} shares`;
  return `${n} more of every haul`;
}

/** Say yes or no to a hero's request for a raise. */
export function answerRaise(ix: Index, town: TownState, heroId: string, agree: boolean): TownState {
  const t = edit(town);
  const h = hero(t, heroId);
  if (!h.raiseAsk) throw new TownError(`${h.name} hasn't asked for a raise.`);
  if (agree && h.raiseAsk.kind === "share") h.cut = (h.cut ?? 0) + h.raiseAsk.amount;
  else if (agree) h.pay = h.pay + h.raiseAsk.amount;
  h.raiseAsk = undefined;
  h.payLevel = h.level;
  applyMorale(ix, h, agree ? { raiseGiven: 1 } : { raiseRefused: 1 }, t.day);
  return t;
}

/** The end of a day in town: pay, builders, rest, morale, the lost, and anyone who's had enough. */
export function endOfDay(ix: Index, t: TownState, away: ReadonlySet<string>): void {
  // Anyone already at the end of their tether goes before the day starts.
  quitters(ix, t);
  payDay(ix, t);
  folkDay(ix, t);
  raiseTalk(ix, t, away);
  t.day += 1;
  buildersWork(ix, t, away);
  workPosts(ix, t, away);
  studyDay(ix, t, away);
  checkCamp(ix, t);
  // A day at the benches is only part of a day's rest (M7.14).
  const worked = workshopDay(ix, t, away);
  digDay(ix, t);
  for (const h of t.roster) {
    if (away.has(h.id)) continue;
    restHero(ix, h, worked.has(h.id) ? ix.lib.workshops.rest : 1);
    dayInTown(ix, t, h);
  }
  sitesNight(ix, t);
  quitters(ix, t);
  // Nobody who has left the guild stays picked (this also mends saves from
  // before quitting porters were taken off the porter list).
  t.party = t.party.filter((id) => findHero(t, id));
  t.porters = t.porters.filter((id) => findHero(t, id));
  tidyPosts(t);
  tidyDesks(t);
  tidyBenches(t);
}

/**
 * The next day. Those at home heal, parties below get on with their trips
 * (their kills thin the dungeon tonight), night falls at the pit, and in the
 * morning anyone whose trip is over is home, and new recruits turn up.
 */
export function rest(ix: Index, town: TownState, names: readonly string[]): TownState {
  const t = edit(town);
  landKills(ix, t);
  const away = awaySet(t);
  nightfall(ix, t, away);
  endOfDay(ix, t, away);
  arrivals(ix, t);
  freshRecruits(ix, t, names);
  offersDay(ix, t, names);
  // The story moves on with what the guild did today (M8.21).
  storyDay(ix, t);
  return t;
}

/**
 * Next day, again and again, until a party is back or heard of, or there's
 * other news worth stopping for: a raid, a finished building, anything in
 * the news. At most `maxDays` days.
 */
export function waitUntilBack(
  ix: Index,
  town: TownState,
  names: readonly string[],
  maxDays = 30,
): TownState {
  let t = town;
  for (let i = 0; i < maxDays && t.outings.length; i++) {
    const before = t;
    t = rest(ix, t, names);
    const heard = t.outings.length !== before.outings.length;
    const raided = t.raids.at(-1) !== before.raids.at(-1) && t.raids.at(-1)?.day === before.day;
    const built = t.construction.length < before.construction.length;
    const said = t.news.some((n) => n.day === t.day && !before.news.includes(n));
    if (heard || raided || built || said) break;
  }
  return t;
}

/**
 * Send the party and pass the days until the town hears what became of it
 * (home, or lost). For tests and the days bot: the old one-click trip.
 */
export function launchAndWait(
  ix: Index,
  town: TownState,
  names: readonly string[],
  maxDays = 60,
): TownState {
  let t = launch(ix, town, names);
  const id = t.outings.at(-1)!.id;
  for (let i = 0; i < maxDays && t.outings.some((o) => o.id === id); i++) t = rest(ix, t, names);
  return t;
}
