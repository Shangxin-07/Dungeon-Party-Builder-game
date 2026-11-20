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
 *
 * The bot restocks used supplies, keeps one hero on the bench and sends the
 * freshest heroes (unless --static), and rests until the party is at 90% HP
 * and nobody is tired or injured, then sends it down. It spends
 * level-ups (the wanted perk if there is one, else the first; free points go
 * in the class's first main stat) and sends a rescue party when someone is
 * trapped. With --build it also builds and upgrades everything else once
 * the defences are up, cheapest first, keeping a few days' wages in hand.
 */
import { heroNames, library } from "../src/content";
import { fatigueTier, heroSheet, type Hero } from "../src/sim/hero";
import { indexLibrary } from "../src/sim/library";
import {
  cancelRescue,
  cantLaunch,
  chooseLevelUp,
  planRescue,
  findHero,
  hire,
  launch,
  newTown,
  nextLevel,
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

const ix = indexLibrary(library);
const days = Number(arg("days") ?? 40);
const policy = arg("policy") ?? "1";
const build = flag("build");
const rotate = !flag("static");
const runs = Number(arg("runs") ?? 1);
const seed0 = Number(arg("seed") ?? 1);

const DEFENCES = ["palisade", "gate", "watchtower"];

/** One bot decision. Returns the next state. */
function step(t: TownState): TownState {
  // Repair anything raided, then build defences, cheapest first.
  if (build) {
    for (const id of t.damaged) if (t.gold >= repairCost(ix, t, id)) t = repair(ix, t, id);
    const next = DEFENCES.map((id) => ({ id, lvl: nextLevel(ix, t, id) }))
      .filter((x) => x.lvl && !t.damaged.includes(x.id) && !underConstruction(t, x.id))
      .sort((a, b) => a.lvl!.cost - b.lvl!.cost)[0];
    if (next && t.gold >= next.lvl!.cost + 40) t = upgrade(ix, t, next.id);
    // Once the walls are up, build and upgrade everything else, cheapest
    // first, keeping a few days' wages in hand: a guild that spends it all.
    const defended = DEFENCES.every((id) => (t.buildings[id] ?? 0) > 0);
    const reserve = 60 + 3 * wageBill(ix, t);
    const more = library.buildings
      .map((b) => ({ id: b.id, lvl: nextLevel(ix, t, b.id) }))
      .filter((x) => x.lvl && !t.damaged.includes(x.id) && !underConstruction(t, x.id))
      .sort((a, b) => a.lvl!.cost - b.lvl!.cost)[0];
    if (defended && more && t.gold >= more.lvl!.cost + reserve) t = upgrade(ix, t, more.id);
  }
  // Spend level-ups.
  for (const h of t.roster) {
    while (findHero(t, h.id)?.levelUps.length) {
      const up = findHero(t, h.id)!.levelUps[0]!;
      const stat = up.freeStat ? ix.cls(h.classId).mainStats[0] : undefined;
      t = chooseLevelUp(ix, t, h.id, up.wants ?? up.offers[0], stat);
    }
  }
  // Go and get anyone who's trapped.
  const site = t.sites.find((s) => s.trapped.some((x) => x.until >= t.day + s.floor - 1));
  if (site && !t.orders.rescue) t = planRescue(ix, t, site.id);
  if (!site && t.orders.rescue) t = cancelRescue(ix, t);
  // Put back what the last trip used up, as far as the gold goes.
  const plan = restockPlan(ix, t);
  let budget = t.gold - 2 * wageBill(ix, t);
  const okd = plan.filter((l) => (budget -= l.cost) >= 0);
  if (okd.length) t = restock(ix, t, okd);
  // Keep a hero on the bench so the party can rotate.
  if (
    rotate &&
    t.roster.length < partySlots(ix, t) + 1 &&
    t.roster.length < rosterSize(ix, t) &&
    t.recruits.length &&
    t.gold >= library.town.hireCost + 60
  )
    t = hire(ix, t, t.recruits[0]!.id);
  // Pick the party: with --static, the same heroes every time (topped up if
  // someone's gone); otherwise the freshest heroes, injuries last.
  const fit = (h: Hero) => h.condition === "ok" && h.hp >= heroSheet(ix, h).derived.maxHp * 0.9;
  const tiredness = (h: Hero) => h.fatigue + (h.injuries.length ? 50 : 0) + (fit(h) ? 0 : 100);
  if (rotate) {
    const best = [...t.roster]
      .sort((a, b) => tiredness(a) - tiredness(b))
      .slice(0, partySlots(ix, t));
    if (!best.some((h) => h.row === "front")) {
      const front = t.roster
        .filter((h) => h.row === "front" && !best.includes(h))
        .sort((a, b) => tiredness(a) - tiredness(b))[0];
      if (front) best[best.length - 1] = front;
    }
    t = { ...t, party: best.map((h) => h.id) };
  }
  while (t.party.length < partySlots(ix, t)) {
    const spare = t.roster.find((h) => !t.party.includes(h.id));
    if (spare) t = toggleParty(ix, t, spare.id);
    else if (t.recruits.length && t.gold >= library.town.hireCost + 30)
      t = hire(ix, t, t.recruits[0]!.id);
    else break;
  }
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
  });
  return launch(ix, t, heroNames);
}

/** Trapped and rescued heroes, counted as trips come back. */
const tally = { trapped: 0, rescued: 0, earned: 0, unpaid: 0, trips: 0, injuries: 0 };
/** Gold in the coffers at these days, for the summary. */
const CHECKPOINTS = [10, 20, 40, 60, 90];
const goldAt: Record<number, number[]> = {};

function play(seed: number, print: boolean) {
  let t = newTown(ix, heroNames, seed);
  let printed = 0;
  const seen = new Set<number>();
  const unpaidDays = new Set<number>();
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
    t = step(t);
    // Count days the wages went unpaid (from the news, which says so).
    for (const n of t.news) if (n.text.startsWith("The guild couldn't pay")) unpaidDays.add(n.day);
    if (t.lastTrip && t.lastTrip.seed !== trip?.seed) {
      tally.trapped += t.lastTrip.trapped?.length ?? 0;
      tally.rescued += t.lastTrip.rescued?.length ?? 0;
      tally.earned += t.lastTrip.goldEarned;
      tally.trips++;
      tally.injuries += Object.keys(t.lastTrip.injuries ?? {}).length;
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
      `  ${h.name.padEnd(8)} ${ix.cls(h.classId).name.padEnd(8)} level ${h.level}, ` +
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
  const levels = library.buildings.reduce((s, b) => s + b.levels.length - b.startLevel, 0);
  for (let i = 0; i < runs; i++) {
    const t = play(seed0 + i, false);
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
    rescued += tally.rescued;
    trapped += tally.trapped;
    tally.rescued = tally.trapped = 0;
  }
  const earned = tally.earned / runs;
  const trips = tally.trips / runs;
  const injuries = tally.injuries / runs;
  firstRaid.sort((a, b) => a - b);
  const median = firstRaid[Math.floor(runs / 2)]!;
  console.log(
    `${runs} towns, ${days} days, policy ${policy}${build ? " + defences" : ""}:\n` +
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
      `  gold from trips per town: ${earned.toFixed(0)}; gold in hand (median) ` +
      Object.entries(goldAt)
        .map(([d, g]) => `day ${d}: ${[...g].sort((a, b) => a - b)[Math.floor(g.length / 2)]}`)
        .join(", "),
  );
}
