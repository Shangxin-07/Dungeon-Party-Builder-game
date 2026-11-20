/**
 * Play a town for a few weeks with a simple bot and print what the dungeon
 * does day by day: population and monster level per floor, what climbs out
 * of the pit, and the raids. For tuning content/dungeon.ts and the defences.
 *
 *   npm run days                               # 40 days, sending a party to floor 1
 *   npm run days -- --policy idle              # never go down: watch it get worse
 *   npm run days -- --policy 2 --build         # floor 2 trips, build defences when affordable
 *   npm run days -- --days 60 --seed 7 --runs 200   # summary over many towns
 *
 * The bot rests until the party is at 90% HP, then sends it down. It spends
 * level-ups (the wanted perk if there is one, else the first; free points go
 * in the class's first main stat) and sends a rescue party when someone is
 * trapped. With --build it also builds favourite buildings once the
 * defences are up.
 */
import { heroNames, library } from "../src/content";
import { heroSheet } from "../src/sim/hero";
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
  setOrders,
  toggleParty,
  underConstruction,
  upgrade,
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
const runs = Number(arg("runs") ?? 1);
const seed0 = Number(arg("seed") ?? 1);

const DEFENCES = ["palisade", "gate", "watchtower"];
const COMFORTS = ["tavern", "training-yard", "vault", "library"];

/** One bot decision. Returns the next state. */
function step(t: TownState): TownState {
  // Repair anything raided, then build defences, cheapest first.
  if (build) {
    for (const id of t.damaged) if (t.gold >= repairCost(ix, t, id)) t = repair(ix, t, id);
    const next = DEFENCES.map((id) => ({ id, lvl: nextLevel(ix, t, id) }))
      .filter((x) => x.lvl && !t.damaged.includes(x.id) && !underConstruction(t, x.id))
      .sort((a, b) => a.lvl!.cost - b.lvl!.cost)[0];
    if (next && t.gold >= next.lvl!.cost + 40) t = upgrade(ix, t, next.id);
    const defended = DEFENCES.every((id) => (t.buildings[id] ?? 0) > 0);
    const comfort = COMFORTS.find((id) => !t.buildings[id] && !underConstruction(t, id));
    const cost = comfort && nextLevel(ix, t, comfort)!.cost;
    if (defended && comfort && t.gold >= (cost as number) + 60) t = upgrade(ix, t, comfort);
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
  // Keep the party full.
  while (t.party.length < partySlots(ix, t)) {
    const spare = t.roster.find((h) => !t.party.includes(h.id));
    if (spare) t = toggleParty(ix, t, spare.id);
    else if (t.recruits.length && t.gold >= library.town.hireCost + 30)
      t = hire(ix, t, t.recruits[0]!.id);
    else break;
  }
  if (policy === "idle") return rest(ix, t, heroNames);
  const ready = t.party.every((id) => {
    const h = findHero(t, id)!;
    return h.condition === "ok" && h.hp >= heroSheet(ix, h).derived.maxHp * 0.9;
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
const tally = { trapped: 0, rescued: 0 };

function play(seed: number, print: boolean) {
  let t = newTown(ix, heroNames, seed);
  let printed = 0;
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
    if (t.lastTrip && t.lastTrip.seed !== trip?.seed) {
      tally.trapped += t.lastTrip.trapped?.length ?? 0;
      tally.rescued += t.lastTrip.rescued?.length ?? 0;
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
  for (let i = 0; i < runs; i++) {
    const t = play(seed0 + i, false);
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
      `  overflow strength on the last night: ${(strength / runs).toFixed(1)}`,
  );
}
