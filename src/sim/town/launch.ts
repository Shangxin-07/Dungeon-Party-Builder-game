/**
 * Launch: send the party down and deal with whatever comes back.
 */
import { runExpedition, type SiteVisit } from "../expedition";
import { applyKills } from "../dungeon";
import { partyAlignment } from "../alignment";
import { fatigueTier, heroSheet, type Hero } from "../hero";
import { risenName } from "../fallen";
import { gainXp } from "../levels";
import type { Index } from "../library";
import { applyMorale, gearTags, moraleChanges, type Facts } from "../morale";
import type { RaidReport } from "../raid";
import { type LostSite, type ScavengedGear, type TownState, TownError, newRecord } from "./state";
import {
  xpBonus,
  built,
  haggler,
  marketRate,
  haulPrice,
  findHero,
  maxHp,
  rescueSite,
  cantLaunch,
  liftFloors,
} from "./read";
import { news, book, roll, edit, hero, listWords, gearOf, addMaterials } from "./internal";
import type { HaulItem } from "../loot";
import { freshRecruits } from "./start";
import { cancelRescue } from "./parties";
import { restHero, lowestHp, wasDowned, maybeInjure } from "./wounds";
import { nightfall, dayInTown, quitters, guildFeels, endOfDay } from "./days";
import { newBody } from "./bodies";

/**
 * Send the party. The whole trip is simulated now; the UI then plays back
 * `lastTrip.result.log`. The town already reflects the outcome, so there's
 * nothing the player can change while watching (DESIGN.md §1: you can only watch).
 */
export function launch(ix: Index, town: TownState, names: readonly string[]): TownState {
  const why = cantLaunch(ix, town);
  if (why) throw new TownError(why);
  const t = edit(town);
  const party = structuredClone(t.party.map((id) => hero(t, id)));
  const porters = structuredClone((t.porters ?? []).map((id) => hero(t, id)));
  const seed = roll(t, (rng) => rng.int(0, 2 ** 31 - 1));
  const startDay = t.day;

  // A rescue run: who's still alive when the party gets there (a floor a day).
  const site = rescueSite(t);
  const visit: SiteVisit | undefined = site && {
    id: site.id,
    floor: site.floor,
    room: site.room,
    trapped: site.trapped.filter((x) => x.until >= startDay + site.floor - 1).map((x) => x.hero),
    bodies: site.bodies ?? [],
    items: site.items,
  };
  const gear: Record<number, ScavengedGear[]> = {};
  for (const g of t.scavenged) (gear[g.floor] ??= []).push(g);

  const risenBefore = new Map((t.risen ?? []).map((r) => [r.id, r]));
  const result = runExpedition(ix, party, t.orders, seed, t.dungeon.floors, {
    site: visit,
    gear,
    porters,
    risen: t.risen ?? [],
    lift: liftFloors(ix, t),
  });
  const wiped = result.outcome === "wiped";
  const backDay = startDay + result.days;

  // Who killed what.
  const kills: Record<string, number> = {};
  for (const e of result.log) {
    const c = e.combat;
    if (c?.kind === "killed" && c.actor && party.some((h) => h.id === c.actor))
      kills[c.actor] = (kills[c.actor] ?? 0) + 1;
  }

  // The Market pays the real value for the haul, whatever the party guessed,
  // less its cut, which the guild's best haggler talks down. The party is
  // still in town's roster as it left, so they can do the haggling (unless
  // they didn't make it back).
  const back = (h: Hero) =>
    !t.party.includes(h.id) ||
    (!wiped && result.party.some((p) => p.id === h.id && p.condition !== "dead"));
  const haggle = haggler(ix, { ...t, roster: t.roster.filter(back) });
  // Heroes' own gear goes back in the store room, and materials into the
  // guild's store (DESIGN.md §8): neither is sold.
  const recovered = result.haul.filter((h) => h.keep);
  const isMaterial = (h: HaulItem) => ix.item(h.item).slot === "material";
  const materials: Record<string, number> = {};
  for (const h of [...result.haul, ...result.porterHaul])
    if (!h.keep && isMaterial(h)) materials[h.item] = (materials[h.item] ?? 0) + 1;
  addMaterials(t, materials);
  const goldEarned = [...result.haul, ...result.porterHaul]
    .filter((h) => !h.keep && !isMaterial(h))
    .reduce((s, h) => s + haulPrice(ix, h.item, h.value, haggle.bonus), 0);
  book(t, "haul", goldEarned);
  const hiddenGold = result.haul
    .filter((h) => h.hidden && !h.keep && !isMaterial(h))
    .reduce((s, h) => s + haulPrice(ix, h.item, h.value, haggle.bonus), 0);
  const tally = t.secrets ?? { found: 0, missed: 0, gold: 0 };
  t.secrets = {
    found: tally.found + result.secrets.found,
    missed: tally.missed + result.secrets.missed,
    gold: tally.gold + hiddenGold,
  };
  t.stash.push(...recovered.map((h) => h.item));
  t.scavenged = t.scavenged.filter((g) => !result.gearTaken.includes(g.id));

  // Experience: kills shared by everyone still alive, plus a little per floor.
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

  // The rescued walk home with the party, unless the party fell too.
  const rescued = wiped ? [] : result.rescued;
  const fallenOnTrip = [...result.party, ...(wiped ? result.rescued : [])];

  // Where the party fell: the dead lie there with their gear; the rest may be
  // trapped, alive, waiting for a rescue party.
  const trappedNames: string[] = [];
  let lostSite: LostSite | undefined;
  if (wiped) {
    lostSite = {
      id: `s${t.nextThingId++}`,
      floor: result.wipeSite?.floor ?? result.deepestFloor,
      room: result.wipeSite?.room ?? 1,
      day: backDay,
      trapped: [],
      bodies: [],
      items: [...result.leftBehind],
    };
  }

  const away = new Set([...t.party, ...porters.map((p) => p.id)]);
  let fallen = 0;
  for (const after of fallenOnTrip) {
    const rec = t.records[after.id] ?? newRecord(startDay);
    if (party.some((h) => h.id === after.id)) {
      rec.trips += 1;
      rec.kills += kills[after.id] ?? 0;
      rec.deepest = Math.max(rec.deepest, result.deepestFloor);
      for (const m of result.seen) if (!rec.seen.includes(m)) rec.seen.push(m);
    }
    t.records[after.id] = rec;
    const dead = after.condition === "dead";
    if (!dead && !wiped) continue;
    fallen++;
    t.roster = t.roster.filter((h) => h.id !== after.id);
    if (!dead && lostSite) {
      const end = heroSheet(ix, after).stats.END;
      const rs = ix.lib.rescue;
      const chance = Math.max(0.05, Math.min(0.95, rs.survival + (end - 10) * rs.survivalPerEnd));
      if (roll(t, (rng) => rng.chance(chance))) {
        lostSite.trapped.push({ hero: structuredClone(after), until: backDay + rs.windowDays - 1 });
        trappedNames.push(after.name);
        continue;
      }
    }
    t.memorial.push({
      heroId: after.id,
      name: after.name,
      classId: after.classId,
      day: backDay,
      floor: lostSite?.floor ?? result.deepestFloor,
      fate: "dead",
      record: rec,
    });
    if (lostSite) {
      lostSite.items.push(...gearOf(ix, after));
      lostSite.bodies.push(newBody(t, after, backDay, lostSite.floor));
    } else {
      // The party brings a fallen friend home, and their gear.
      t.stash.push(...gearOf(ix, after).map((g) => g.item));
      t.bodies.push(newBody(t, after, backDay, 0));
    }
  }
  // Bodies the party picked up: home with it, or lying where it fell.
  for (const b of result.bodies) {
    if (lostSite) lostSite.bodies.push({ ...b, floor: lostSite.floor });
    else t.bodies.push({ ...b, floor: 0 });
  }
  if (!wiped && result.bodies.length)
    news(t, `The party carried home ${listWords(result.bodies.map((b) => b.hero.name))}.`, "good");
  for (const id of result.risenSlain) {
    const r = risenBefore.get(id);
    if (r) news(t, `${risenName(ix, r)} was put down on floor ${r.floor}.`, "good");
  }
  t.risen = (t.risen ?? []).filter((r) => !result.risenSlain.includes(r.id));
  if (lostSite && (lostSite.trapped.length || lostSite.items.length || lostSite.bodies.length))
    t.sites.push(lostSite);

  // A rescue run: take the freed heroes and the gear off the site.
  if (result.siteVisited) {
    const s = t.sites.find((x) => x.id === result.siteVisited);
    if (s) {
      const freed = new Set(result.rescued.map((h) => h.id));
      s.trapped = s.trapped.filter((x) => !freed.has(x.hero.id));
      s.items = result.siteLeft;
      s.bodies = [];
    }
  }
  for (const h of rescued) {
    const rec = t.records[h.id] ?? newRecord(startDay);
    t.records[h.id] = rec;
    t.roster.push(structuredClone(h));
  }

  // Back home: the party's heroes, as they came out of the pit.
  for (const after of result.party) {
    if (after.condition === "dead" || wiped) continue;
    const i = t.roster.findIndex((h) => h.id === after.id);
    t.roster[i] = structuredClone(after);
  }

  // Wear and tear: the trip tires everyone out, and a hero who was knocked
  // down may bring home an injury.
  const fights = result.log.filter((e) => e.kind === "fight" && e.monsters).length;
  const tiredBy =
    ix.lib.wear.fatiguePerTripDay * result.days + ix.lib.wear.fatiguePerFight * fights;
  const injuries: Record<string, string[]> = {};
  const fatigue: Record<string, number> = {};
  for (const before of party) {
    const h = findHero(t, before.id);
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

  // Porters: they watched the fights and bank some XP for when they train.
  // After a wipe, the ones who didn't make it home are gone.
  for (const run of result.porters) {
    const p = findHero(t, run.id);
    if (!p?.porter) continue;
    const rec = t.records[p.id] ?? newRecord(startDay);
    rec.trips += 1;
    rec.deepest = Math.max(rec.deepest, result.deepestFloor);
    t.records[p.id] = rec;
    if (!run.home) {
      t.roster = t.roster.filter((h) => h.id !== p.id);
      t.memorial.push({
        name: p.name,
        classId: p.classId,
        day: backDay,
        floor: lostSite?.floor ?? result.deepestFloor,
        fate: "dead",
        record: rec,
      });
      fallen++;
      continue;
    }
    p.porter.watched += fights;
    p.porter.xp += Math.round(xpEach * ix.lib.town.porters.xpShare);
    p.fatigue = Math.min(100, (p.fatigue ?? 0) + tiredBy);
    fatigue[p.id] = p.fatigue;
  }
  if (wiped) {
    const ran = result.porters.filter((r) => r.home).map((r) => r.name);
    if (ran.length)
      news(
        t,
        `${listWords(ran)} ran back from floor ${lostSite?.floor ?? result.deepestFloor} with news of the party` +
          `${result.porterHaul.length ? " and what loot they could carry" : ""}.`,
        "bad",
      );
  }

  // How everyone feels about it (DESIGN.md §6).
  const morale: Record<string, { amount: number; reason: string }[]> = {};
  const leaderCha = Math.max(10, ...party.map((h) => heroSheet(ix, h).stats.CHA));
  const share = goldEarned / party.length;
  // Alignment (DESIGN.md §7): clashes cost morale for every day down there.
  const tripDays = Math.max(1, result.days);
  const aligned = partyAlignment(ix, party);
  // Risen guild mates each hero knew (they'd joined by the day the risen died).
  const knewRisen = (h: Hero) =>
    result.risenMet.filter((id) => {
      const r = risenBefore.get(id);
      return !!r && (town.records[h.id]?.joined ?? Infinity) <= r.body.died;
    }).length;
  for (const before of party) {
    const h = findHero(t, before.id);
    if (!h) continue;
    const prevDeepest = town.records[h.id]?.deepest ?? 0;
    const prevSeen = town.records[h.id]?.seen ?? [];
    const tags = gearTags(ix, before);
    const facts: Facts = {
      goldShare: share,
      emptyHanded: goldEarned + recovered.length + Object.keys(materials).length === 0 ? 1 : 0,
      kills: kills[h.id] ?? 0,
      newFloors: Math.max(0, result.deepestFloor - prevDeepest),
      sameOldFloor: result.deepestFloor <= prevDeepest ? 1 : 0,
      newMonsters: result.seen.filter((m) => !prevSeen.includes(m)).length,
      retreated: result.outcome === "retreated" ? 1 : 0,
      fallenComrades: fallen,
      allHome: fallen === 0 ? 1 : 0,
      rescuedComrades: rescued.length,
      wounded: h.condition !== "ok" || h.hp < maxHp(ix, h) / 3 ? 1 : 0,
      sentHurt: before.hp < maxHp(ix, before) * 0.75 ? 1 : 0,
      likedGear: before.likes && tags.has(before.likes) ? 1 : 0,
      dislikedGear: before.dislikes && tags.has(before.dislikes) ? 1 : 0,
      levelUp: levels[h.id] ?? 0,
      sentTired: fatigueTier(ix, before) ? 1 : 0,
      injured: injuries[h.id]?.length ? 1 : 0,
      alignmentClash: aligned.clashing.some((x) => x.id === h.id) ? tripDays : 0,
      partyDivided: aligned.divided ? tripDays : 0,
      goodEvilFriction:
        aligned.friction &&
        !aligned.clashing.some((x) => x.id === h.id) &&
        Math.abs(ix.alignment(h.alignment).position) >= 1
          ? tripDays
          : 0,
      foughtRisen: knewRisen(before),
    };
    morale[h.id] = moraleChanges(ix, h, facts, { leaderCha });
    applyMorale(ix, h, facts, backDay, { leaderCha });
  }
  for (const h of rescued) {
    const r = findHero(t, h.id)!;
    morale[h.id] = moraleChanges(ix, r, { wasTrapped: 1 });
    applyMorale(ix, r, { wasTrapped: 1 }, backDay);
  }
  guildFeels(
    ix,
    t,
    { fallenComrades: fallen, rescuedComrades: rescued.length },
    new Set([...away, ...rescued.map((h) => h.id)]),
  );
  // Fit heroes left at home while the party went down (Glory heroes mind).
  for (const h of t.roster) {
    if (away.has(h.id) || h.porter || rescued.some((r) => r.id === h.id)) continue;
    const fit = h.condition === "ok" && !(h.injuries ?? []).length && !fatigueTier(ix, h);
    if (fit) applyMorale(ix, h, { benched: 1 }, startDay);
  }
  for (const n of trappedNames)
    news(
      t,
      `${n} is trapped on floor ${lostSite!.floor}, alive. A rescue party has ${ix.lib.rescue.windowDays} days.`,
      "bad",
    );
  if (rescued.length)
    news(
      t,
      `${listWords(rescued.map((h) => h.name))} ${rescued.length > 1 ? "are" : "is"} home, rescued.`,
      "good",
    );

  // Their kills thin out the dungeon.
  t.dungeon = applyKills(t.dungeon, result.floorKills);

  // Time passes, one night at a time. Those who stayed home rest and guard the
  // town; the party gets a night's sleep when it's back.
  const raids: RaidReport[] = [];
  for (let i = 0; i < result.days; i++) {
    const raid = nightfall(ix, t, away);
    if (raid) raids.push(raid);
    endOfDay(ix, t, away);
  }
  for (const h of t.roster) {
    if (!away.has(h.id)) continue;
    restHero(ix, h, 1);
    dayInTown(ix, t, h);
  }
  const quit = quitters(ix, t);
  t.party = t.party.filter((id) => findHero(t, id));
  t.porters = (t.porters ?? []).filter((id) => findHero(t, id));
  if (result.siteVisited || (t.orders.rescue && !rescueSite(t)))
    t.orders = cancelRescue(ix, t).orders;
  freshRecruits(ix, t, names);

  t.lastTrip = {
    day: startDay,
    seed,
    party,
    result,
    goldEarned,
    kills,
    raids,
    xp,
    levels,
    morale,
    trapped: trappedNames,
    rescued: rescued.map((h) => h.name),
    recovered,
    quit,
    injuries,
    fatigue,
    haggledBy: haggle.hero?.name,
    lootRate: marketRate(ix, ix.lib.town.haulRate, haggle.bonus),
    hiddenGold,
    materials,
  };
  return t;
}
