/**
 * Play a town for a few weeks with a simple bot and print what the dungeon
 * does day by day: population and monster level per floor, what climbs out
 * of the pit, and the raids. For tuning content/dungeon.ts and the defences.
 *
 *   npm run days                               # 40 days, sending a party to floor 1
 *   npm run days -- --policy idle              # never go down: watch it get worse
 *   npm run days -- --policy 2 --build         # floor 2 trips, build defences when affordable
 *   npm run days -- --days 60 --seed 7 --runs 200   # summary over many towns
 *   npm run days -- --policy 2 --build --static     # never rotate the party
 *   npm run days -- --policy 1 --clear 50           # thin floor 1 out by half each trip
 *   npm run days -- --policy 2 --porters 2          # keep two porters (trained when the party is short)
 *   npm run days -- --policy 2 --build --parties    # two fixed parties, sending whichever is fresher
 *   npm run days -- --policy 2 --build --multiclass # each hero picks up a second class (and any combo)
 *   npm run days -- --camp --policy 1 --build       # start at the mining camp (the opening)
 *   npm run days -- --camp --unlucky --palisade-first # no timber ever drops: trade ore for it
 *
 * The bot restocks used supplies, keeps one hero on the bench and sends the
 * freshest heroes (unless --static), and rests until the party is at 90% HP
 * and nobody is tired or injured, then sends it down. It spends
 * level-ups (the wanted perk if there is one, else the first; free points go
 * in the class's first main stat) and sends a rescue party when someone is
 * trapped. With --parties it fills the roster for two whole parties and
 * alternates them, the way a player with two parties on file would. With --build it also builds and upgrades everything else once
 * the defences are up, cheapest first, keeping a few days' wages in hand.
 */
import { heroNames, library } from "../src/content";
import { STATS } from "../src/content/types";
import { bestClass, fatigueTier, heroSheet, heroTitle, type Hero } from "../src/sim/hero";
import { openClasses } from "../src/sim/levels";
import { indexLibrary } from "../src/sim/library";
import {
  answerRaise,
  autoStart,
  fightsToTrain,
  hirePorter,
  hirePrice,
  kitOut,
  trainPorter,
  cancelRescue,
  cantLaunch,
  chooseLevelUp,
  chooseLevelClass,
  built,
  planRescue,
  resurrect,
  resurrectQuote,
  bury,
  burialCost,
  findHero,
  hire,
  launch,
  newTown,
  nextLevel,
  materialsShort,
  partySlots,
  repair,
  repairCost,
  rest,
  restock,
  restockPlan,
  rosterSize,
  setOrders,
  toggleParty,
  underConstruction,
  upgrade,
  assignPost,
  trade,
  buy,
  equip,
  wageBill,
  type TownState,
} from "../src/sim/town";
import { validateLibrary } from "../src/sim/validate";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const flag = (name: string) => process.argv.includes(`--${name}`);

const errors = validateLibrary(library);
if (errors.length) {
  console.error("Content problems:\n" + errors.map((e) => `  - ${e}`).join("\n"));
  process.exit(1);
}

// --unlucky: the camp's posts and raid spoils never turn up timber, only ore,
// so the camp can only be held by trading ore for timber with the miners.
const unlucky = process.argv.includes("--unlucky");
const ix = indexLibrary(
  unlucky
    ? {
        ...library,
        lootTables: library.lootTables.map((l) => ({
          ...l,
          entries: l.entries.map((e) => (e.item === "timber" ? { ...e, item: "iron-ore" } : e)),
        })),
      }
    : library,
);
const days = Number(arg("days") ?? 40);
const policy = arg("policy") ?? "1";
const build = flag("build");
const rotate = !flag("static");
const runs = Number(arg("runs") ?? 1);
const seed0 = Number(arg("seed") ?? 1);
const clear = Number(arg("clear") ?? 0);
const porterCount = Number(arg("porters") ?? 0);
const multiclass = flag("multiclass");
const twoParties = flag("parties");
const camp = flag("camp");

const DEFENCES = ["palisade", "gate", "watchtower"];

/** One bot decision. Returns the next state. */
/** Sign the first recruit in the class they suit best, and kit them out. */
function signUp(t: TownState): TownState {
  const r = t.recruits[0]!;
  t = hire(ix, t, r.id, r.classId);
  return kitOut(ix, t, t.roster.at(-1)!.id);
}

const FALLEN_BUILDINGS = ["temple", "graveyard"];

/**
 * Posts round the pit (DESIGN.md §8). At the camp: two on the salvage crew
 * while timber is short, the rest at the seam for gold, anyone left over on
 * the barricade. Later, whoever isn't in the party salvages, or holds the
 * barricade once the store has timber to spare.
 */
function manPosts(t: TownState): TownState {
  const timber = t.materials.timber ?? 0;
  // Hero i takes order[i] (or the next post along with room).
  const order = t.camp
    ? timber < 10
      ? ["salvage", "salvage", "seam", "barricade", "seam", "barricade"]
      : ["seam", "seam", "barricade", "barricade", "barricade", "lookout"]
    : timber < 6
      ? ["salvage", "salvage", "salvage", "barricade"]
      : ["barricade", "barricade", "barricade", "lookout"];
  let posted = { ...t, posts: {} as Record<string, string[]> };
  const free = (id: string) => ix.post(id).slots - (posted.posts[id]?.length ?? 0);
  const heroes = t.roster.filter((h) => t.camp || !t.party.includes(h.id));
  heroes.forEach((h, i) => {
    const id = [...order.slice(i), ...order].find(
      (p) => (!h.porter || ix.post(p).porters) && free(p) > 0,
    );
    if (id) posted = assignPost(ix, posted, h.id, id);
  });
  return posted;
}

/**
 * After the opening, swap makeshift camp kit for the class's proper kit as
 * the gold allows (keeping a few days' wages in hand), the way a player would.
 */
function properKit(t: TownState): TownState {
  if (t.camp) return t;
  for (const h of t.roster) {
    if (h.porter) continue;
    for (const id of ix.cls(h.classId).startingKit) {
      const item = ix.item(id);
      const slot = item.slot as keyof Hero["equipment"];
      if (!(slot in h.equipment) && !["weapon", "offhand", "armor"].includes(item.slot)) continue;
      const now = findHero(t, h.id)!.equipment[slot];
      if (now && !ix.item(now).tags.includes("makeshift")) continue;
      if (now === id) continue;
      if (!t.stash.includes(id)) {
        if (t.gold < item.value + 40 + 3 * wageBill(ix, t)) continue;
        try {
          t = buy(ix, t, id);
        } catch {
          continue;
        }
      }
      t = equip(ix, t, h.id, id);
    }
  }
  return t;
}

function step(t: TownState): TownState {
  t = properKit(t);
  // The opening: swap ore for timber when the store is short of it, then
  // build what holds the camp as soon as it can be paid for (--palisade-first
  // builds the walls before the Guild Hall).
  while (t.camp && (t.materials.timber ?? 0) < 10 && (t.materials["iron-ore"] ?? 0) >= 2)
    t = trade(ix, t, 0);
  const unlockOrder = Object.keys(library.opening.unlock);
  if (flag("palisade-first")) unlockOrder.reverse();
  for (const id of unlockOrder) {
    if (!t.camp) break;
    const lvl = nextLevel(ix, t, id);
    if (
      lvl &&
      (t.buildings[id] ?? 0) < library.opening.unlock[id]! &&
      !underConstruction(t, id) &&
      !materialsShort(ix, t, lvl.materials) &&
      t.gold >= lvl.cost
    )
      t = upgrade(ix, t, id);
  }
  // Repair anything raided, then build defences, cheapest first. (At the
  // camp, only what holds it: see above.)
  if (build && !t.camp) {
    for (const id of t.damaged) if (t.gold >= repairCost(ix, t, id)) t = repair(ix, t, id);
    // Anything the store has the materials for (DESIGN.md §8).
    const buildable = (x: { id: string; lvl?: { materials?: Record<string, number> } }) =>
      x.lvl &&
      !t.damaged.includes(x.id) &&
      !underConstruction(t, x.id) &&
      !materialsShort(ix, t, x.lvl.materials);
    const next = DEFENCES.map((id) => ({ id, lvl: nextLevel(ix, t, id) }))
      .filter(buildable)
      .sort((a, b) => a.lvl!.cost - b.lvl!.cost)[0];
    if (next && t.gold >= next.lvl!.cost + 40) t = upgrade(ix, t, next.id);
    // Once the walls are up, build and upgrade everything else, cheapest
    // first, keeping a few days' wages in hand: a guild that spends it all.
    const defended = DEFENCES.every((id) => (t.buildings[id] ?? 0) > 0);
    const reserve = 60 + 3 * wageBill(ix, t);
    // The Temple and Graveyard only once there's a body waiting for them.
    const waiting = (t.bodies ?? []).length > 0;
    const more = library.buildings
      .filter((b) => waiting || !FALLEN_BUILDINGS.includes(b.id))
      .map((b) => ({ id: b.id, lvl: nextLevel(ix, t, b.id) }))
      .filter(buildable)
      .sort((a, b) => a.lvl!.cost - b.lvl!.cost)[0];
    if (defended && more && t.gold >= more.lvl!.cost + reserve) t = upgrade(ix, t, more.id);
  }
  // Spend level-ups: into the main class, or with --multiclass into any
  // advanced or combo class that's open, else one second base class.
  for (const h of t.roster) {
    while (findHero(t, h.id)?.levelUps.length) {
      let up = findHero(t, h.id)!.levelUps[0]!;
      if (!up.classId) {
        const hero = findHero(t, h.id)!;
        const open = openClasses(ix, hero, built(t));
        const pick =
          (multiclass &&
            (open.find((o) => !o.level && (o.cls.kind ?? "base") !== "base") ??
              (Object.keys(hero.classes).length < 2 ? open.find((o) => !o.level) : undefined))) ||
          open.find((o) => o.cls.id === hero.classId)!;
        t = chooseLevelClass(ix, t, h.id, pick.cls.id);
        up = findHero(t, h.id)!.levelUps[0]!;
      }
      const now = findHero(t, h.id)!;
      const stat = up.freeStat
        ? ([...ix.cls(now.classId).mainStats, ...STATS].find((s) => now.stats[s] < 30) ?? "CHA")
        : undefined;
      t = chooseLevelUp(ix, t, h.id, up.wants ?? up.offers[0], stat);
    }
  }
  // The fallen (DESIGN.md §10): resurrect while the gold holds out (a week of
  // wages in hand), otherwise bury.
  for (const b of [...(t.bodies ?? [])]) {
    const q = resurrectQuote(ix, t, b.id);
    if (!q.why && q.terms && t.gold >= q.terms.gold + 7 * wageBill(ix, t)) {
      t = resurrect(ix, t, b.id);
      t = kitOut(ix, t, b.hero.id);
      tally.resurrected++;
    } else if (
      (b.risen || (!q.terms && (t.buildings.temple ?? 0) > 0)) &&
      (burialCost(ix, t) ?? Infinity) <= t.gold
    ) {
      t = bury(ix, t, b.id);
      tally.buried++;
    }
  }
  // Go and get anyone who's trapped, or else the bodies before they rise.
  const site =
    t.sites.find((s) => s.trapped.some((x) => x.until >= t.day + s.floor - 1)) ??
    t.sites.find((s) => s.bodies.some((b) => !b.risen) && s.floor <= Number(policy));
  if (site && !t.orders.rescue) t = planRescue(ix, t, site.id);
  if (!site && t.orders.rescue) t = cancelRescue(ix, t);
  // Agree to raises while the gold holds out (a month of the new wage bill).
  for (const h of t.roster)
    if (h.raiseAsk)
      t = answerRaise(ix, t, h.id, t.gold > 30 * (wageBill(ix, t) + h.raiseAsk.amount));
  // Put back what the last trip used up, as far as the gold goes.
  const plan = restockPlan(ix, t);
  let budget = t.gold - 2 * wageBill(ix, t);
  const okd = plan.filter((l) => (budget -= l.cost) >= 0);
  if (okd.length) t = restock(ix, t, okd);
  // Porters (--porters N): keep N, and train one when the party is short.
  const fighters = () => t.roster.filter((h) => !h.porter);
  for (const p of t.roster.filter((h) => h.porter && !fightsToTrain(ix, h)))
    if (fighters().length < partySlots(ix, t) + 1) {
      t = trainPorter(ix, t, p.id, bestClass(ix, p.stats));
      t = kitOut(ix, t, p.id);
    }
  const porterOnOffer = t.recruits.find((r) => r.untrained);
  if (
    t.roster.filter((h) => h.porter).length < porterCount &&
    porterOnOffer &&
    t.roster.length < rosterSize(ix, t) &&
    t.gold >= library.town.porters.hireCost + 60
  )
    t = hirePorter(ix, t, porterOnOffer.id);
  t = {
    ...t,
    porters: t.roster
      .filter((h) => h.porter && h.condition === "ok" && !h.injuries.length)
      .slice(0, library.town.porters.slots)
      .map((h) => h.id),
  };
  // Keep a hero on the bench so the party can rotate (a whole second party with --parties).
  if (
    rotate &&
    fighters().length < partySlots(ix, t) * (twoParties ? 2 : 1) + (twoParties ? 0 : 1) &&
    t.roster.length < rosterSize(ix, t) &&
    t.recruits.length &&
    t.gold >= hirePrice(ix, t, t.recruits[0]!) + 60
  )
    t = signUp(t);
  // Pick the party: with --static, the same heroes every time (topped up if
  // someone's gone); otherwise the freshest heroes, injuries last.
  const fit = (h: Hero) => h.condition === "ok" && h.hp >= heroSheet(ix, h).derived.maxHp * 0.9;
  const tiredness = (h: Hero) => h.fatigue + (h.injuries.length ? 50 : 0) + (fit(h) ? 0 : 100);
  if (twoParties) {
    // Two fixed parties in roster order; send the one whose most worn-out hero is freshest.
    const n = partySlots(ix, t);
    const fs = fighters();
    const worst = (hs: Hero[]) => Math.max(...hs.map(tiredness));
    const halves = [fs.slice(0, n), fs.slice(n, 2 * n)].filter((hs) => hs.length);
    const pick = halves.sort((a, b) => worst(a) - worst(b))[0] ?? [];
    t = { ...t, party: pick.map((h) => h.id) };
  } else if (rotate) {
    const best = fighters()
      .sort((a, b) => tiredness(a) - tiredness(b))
      .slice(0, partySlots(ix, t));
    if (!best.some((h) => h.row === "front")) {
      const front = fighters()
        .filter((h) => h.row === "front" && !best.includes(h))
        .sort((a, b) => tiredness(a) - tiredness(b))[0];
      if (front) best[best.length - 1] = front;
    }
    t = { ...t, party: best.map((h) => h.id) };
  }
  while (t.party.length < partySlots(ix, t)) {
    const spare = fighters().find((h) => !t.party.includes(h.id));
    if (spare) t = toggleParty(ix, t, spare.id);
    else if (t.recruits.length && t.gold >= hirePrice(ix, t, t.recruits[0]!) + 30) t = signUp(t);
    else break;
  }
  t = manPosts(t);
  if (policy === "idle") return rest(ix, t, heroNames);
  // Go when everyone is healed and nobody is tired or hurt.
  const ready = t.party.every((id) => {
    const h = findHero(t, id)!;
    return fit(h) && !fatigueTier(ix, h) && !h.injuries.length;
  });
  if (!ready || cantLaunch(ix, t)) return rest(ix, t, heroNames);
  const site2 = t.sites.find((s) => s.id === t.orders.rescue);
  t = setOrders(ix, t, {
    ...t.orders,
    targetFloor: Math.max(Number(policy), site2?.floor ?? 0),
    clearPercent: clear || undefined,
  });
  return launch(ix, t, heroNames);
}

/** Trapped and rescued heroes, counted as trips come back. */
const tally = {
  trapped: 0,
  rescued: 0,
  earned: 0,
  unpaid: 0,
  trips: 0,
  injuries: 0,
  resurrected: 0,
  buried: 0,
  rose: 0,
  putDown: 0,
  /** --camp: the day each town held the camp, and who died before it did. */
  campHeld: [] as number[],
  campDeaths: 0,
  campDeathsTotal: 0,
  campRaids: 0,
  /** Materials brought home, by id (DESIGN.md §8). */
  materials: {} as Record<string, number>,
};
/** Gold in the coffers at these days, for the summary. */
const CHECKPOINTS = [10, 20, 40, 60, 90];
const goldAt: Record<number, number[]> = {};

function play(seed: number, print: boolean) {
  let t = autoStart(ix, newTown(ix, heroNames, seed, { camp }));
  let printed = 0;
  const seen = new Set<number>();
  const unpaidDays = new Set<number>();
  const roseNews = new Set<string>();
  if (print) {
    console.log(
      `Policy: ${policy === "idle" ? "never go down" : `trips to floor ${policy}`}` +
        `${build ? ", building defences" : ""}. ${days} days, seed ${seed}.\n`,
    );
    console.log(
      "night  population (lvl)           out  str  def  outcome     gold  heroes  damaged",
    );
  }
  while (t.day <= days) {
    const trip = t.lastTrip;
    const wasCamp = t.camp;
    t = step(t);
    if (wasCamp && !t.camp) {
      tally.campHeld.push(t.day);
      tally.campRaids += t.pit.filter((n) => n.outcome !== "held").length;
    }
    if (t.camp) tally.campDeaths = t.memorial.length;
    console.log(
      t.day,
      t.camp ? "camp" : "",
      JSON.stringify(t.posts),
      JSON.stringify(t.materials),
      t.gold,
      JSON.stringify(t.buildings),
      t.construction.map((c) => c.building).join(),
    );
    // Count days the wages went unpaid (from the news, which says so).
    for (const n of t.news) if (n.text.startsWith("The guild couldn't pay")) unpaidDays.add(n.day);
    for (const n of t.news)
      if (/never brought home/.test(n.text)) roseNews.add(`${n.day}${n.text}`);
    if (t.lastTrip && t.lastTrip.seed !== trip?.seed) {
      tally.trapped += t.lastTrip.trapped?.length ?? 0;
      tally.rescued += t.lastTrip.rescued?.length ?? 0;
      tally.earned += t.lastTrip.goldEarned;
      for (const [id, n] of Object.entries(t.lastTrip.materials ?? {}))
        tally.materials[id] = (tally.materials[id] ?? 0) + n;
      tally.trips++;
      tally.injuries += Object.keys(t.lastTrip.injuries ?? {}).length;
      tally.putDown += t.lastTrip.result.risenSlain.length;
    }
    for (const c of CHECKPOINTS)
      if (c <= days && t.day >= c && !seen.has(c)) {
        seen.add(c);
        (goldAt[c] ??= []).push(t.gold);
      }
    if (!print) continue;
    for (const n of t.pit.slice(printed - t.pit.length || t.pit.length)) {
      const floors = t.dungeon.floors
        .map((f) => `${String(f.population).padStart(2)} (${f.level.toFixed(1)})`)
        .join(" ");
      console.log(
        `${String(n.day).padStart(5)}  ${floors.padEnd(25)}  ${String(n.climbed).padStart(3)}  ` +
          `${String(n.strength).padStart(3)}  ${String(n.defence).padStart(3)}  ` +
          `${n.outcome.padEnd(10)}  ${String(t.gold).padStart(4)}  ${String(t.roster.length).padStart(6)}  ` +
          `${t.damaged.join(",")}`,
      );
    }
    printed = t.pit.length;
  }
  tally.unpaid += unpaidDays.size;
  tally.rose += roseNews.size;
  return t;
}

if (runs === 1) {
  const t = play(seed0, true);
  const raids = t.pit.filter((n) => n.outcome !== "held");
  console.log(
    `\nBy day ${t.day}: ${raids.length} raids got past the defences ` +
      `(${raids.filter((r) => r.outcome === "repelled").length} beaten off), ` +
      `${t.memorial.length} heroes lost, ${t.gold} gold.`,
  );
  for (const h of t.roster)
    console.log(
      `  ${h.name.padEnd(8)} ${heroTitle(ix, h, true).padEnd(20)}, ` +
        `morale ${h.morale} (${h.motivation}, loves the ${h.favourite}), perks: ${h.perks.join(", ") || "none"}\n` +
        h.moraleLog
          .map(
            (n) =>
              `      day ${n.since ? `${n.since}-` : ""}${n.day}: ${n.amount > 0 ? "+" : ""}${n.amount} ${n.reason}`,
          )
          .join("\n"),
    );
  for (const n of t.news) console.log(`  day ${n.day}: ${n.text}`);
} else {
  const firstRaid: number[] = [];
  let raids = 0;
  let beaten = 0;
  let lost = 0;
  let strength = 0;
  let quit = 0;
  let levelSum = 0;
  let heroes = 0;
  let moraleSum = 0;
  let unhappy = 0;
  let rescued = 0;
  let trapped = 0;
  let built = 0;
  let unpaid = 0;
  const secrets = { found: 0, missed: 0, gold: 0 };
  const levels = library.buildings.reduce((s, b) => s + b.levels.length - b.startLevel, 0);
  for (let i = 0; i < runs; i++) {
    const t = play(seed0 + i, false);
    tally.campDeathsTotal += tally.campDeaths;
    tally.campDeaths = 0;
    built += library.buildings.reduce((s, b) => s + (t.buildings[b.id] ?? 0) - b.startLevel, 0);
    unpaid += tally.unpaid;
    tally.unpaid = 0;
    const r = t.pit.filter((n) => n.outcome !== "held");
    raids += r.length;
    beaten += r.filter((n) => n.outcome === "repelled").length;
    lost += t.memorial.length;
    strength += t.pit.at(-1)?.strength ?? 0;
    firstRaid.push(r[0]?.day ?? Infinity);
    quit += t.departed.length;
    for (const h of t.roster) {
      heroes++;
      levelSum += h.level;
      moraleSum += h.morale;
      if (h.morale < library.morale.low) unhappy++;
    }
    secrets.found += t.secrets.found;
    secrets.missed += t.secrets.missed;
    secrets.gold += t.secrets.gold;
    rescued += tally.rescued;
    trapped += tally.trapped;
    tally.rescued = tally.trapped = 0;
  }
  const earned = tally.earned / runs;
  const trips = tally.trips / runs;
  const injuries = tally.injuries / runs;
  firstRaid.sort((a, b) => a - b);
  const median = firstRaid[Math.floor(runs / 2)]!;
  const held = [...tally.campHeld].sort((a, b) => a - b);
  console.log(
    `${runs} towns, ${days} days, policy ${policy}${build ? " + defences" : ""}${camp ? ", starting at the camp" : ""}:\n` +
      (camp
        ? `  camp held (median): ${held.length < runs / 2 ? "not by the end" : `day ${held[Math.floor(runs / 2)]}`}` +
          ` (${held.length} of ${runs} towns); ${(tally.campRaids / runs).toFixed(1)} raids and ` +
          `${(tally.campDeathsTotal / runs).toFixed(1)} deaths before then\n`
        : "") +
      `  first raid (median): day ${median === Infinity ? "never" : median}\n` +
      `  raids per town: ${(raids / runs).toFixed(1)} (${((beaten / Math.max(1, raids)) * 100).toFixed(0)}% beaten off)\n` +
      `  heroes lost per town: ${(lost / runs).toFixed(1)} (${(trapped / runs).toFixed(1)} trapped, ${(rescued / runs).toFixed(1)} rescued)\n` +
      `  heroes who quit per town: ${(quit / runs).toFixed(1)}\n` +
      `  on the roster at the end: level ${(levelSum / Math.max(1, heroes)).toFixed(1)} on average, ` +
      `morale ${(moraleSum / Math.max(1, heroes)).toFixed(0)}, ${((unhappy / Math.max(1, heroes)) * 100).toFixed(0)}% unhappy\n` +
      `  overflow strength on the last night: ${(strength / runs).toFixed(1)}\n` +
      `  trips per town: ${trips.toFixed(1)}, injuries on trips: ${injuries.toFixed(1)}\n` +
      `  buildings: ${(built / runs).toFixed(1)} of ${levels} levels built; ` +
      `${(unpaid / runs).toFixed(1)} days with unpaid wages\n` +
      `  hidden caches per town: ${(secrets.found / runs).toFixed(1)} found, ` +
      `${(secrets.missed / runs).toFixed(1)} walked past, worth ${(secrets.gold / runs).toFixed(0)} gold\n` +
      `  the fallen per town: ${(tally.resurrected / runs).toFixed(1)} resurrected, ` +
      `${(tally.buried / runs).toFixed(1)} buried, ${(tally.rose / runs).toFixed(1)} rose, ` +
      `${(tally.putDown / runs).toFixed(1)} risen put down\n` +
      `  materials brought home per town: ${
        Object.entries(tally.materials)
          .map(([id, n]) => `${(n / runs).toFixed(1)} ${ix.item(id).name.toLowerCase()}`)
          .join(", ") || "none"
      }\n` +
      `  gold from trips per town: ${earned.toFixed(0)}; gold in hand (median) ` +
      Object.entries(goldAt)
        .map(([d, g]) => `day ${d}: ${[...g].sort((a, b) => a - b)[Math.floor(g.length / 2)]}`)
        .join(", "),
  );
}
