/**
 * Lost below (M7.02, DESIGN.md §17.3): a party that fell or holed up, and
 * what the town hears of it, when, and from whom. See launch.ts.
 */
import { heroSheet } from "../hero";
import type { Index } from "../library";
import { type LostSite, type Outing, type TownState, TownError, newRecord } from "./state";
import { haggler, fence, findHero, outingStatus } from "./read";
import { news, roll, edit, listWords, gearOf, addMaterials } from "./internal";
import { bringHome } from "./haul";
import { payShares } from "./pay";
import { recordSightings } from "./fog";
import { guildFeels } from "./days";
import { newBody } from "./bodies";
import { placeSeal } from "./seals";
import { stoneNews } from "./stones";
import { coreNews } from "./core";
import { noteShards } from "./shards";
import { landAllKills } from "./launch";
import { heroKills, keepTrip, ownResult, remember, tidySearch, tripXp } from "./homecoming";
import { deserterReturns, grudgeHolders, holdGrudges } from "./deserters";

/**
 * The day a party falls or holes up: what's left of it lies below, at a site
 * the town doesn't know about yet. The trapped's clock starts now (DESIGN.md
 * §17.3). If a porter got away, the town hears at once.
 */
export function partyFalls(ix: Index, t: TownState, o: Outing): void {
  const result = ownResult(o);
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
  t.risen = t.risen.filter((r) => !result.risenSlain.includes(r.id));
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
  placeSeal(ix, t, o, true);
  stoneNews(ix, t, o);
  coreNews(ix, t, o);
  const result = o.result;
  // Any shards they found are gone from where they were (DESIGN.md §20).
  noteShards(ix, t, result, false);
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
    t.porters = t.porters.filter((x) => x !== id);
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
    p.fatigue = Math.min(100, p.fatigue + ix.lib.wear.fatiguePerFight * fights);
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
    recordSightings(ix, t, o);
    // The porters who got out take their cut of what they carried (M7.12).
    const shares = payShares(
      ix,
      t,
      result.porters.filter((r) => r.home).flatMap((r) => findHero(t, r.id) ?? []),
      goldEarned,
    );
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
      shares,
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
  const found = town.outings.find((o) => o.id === outingId);
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
