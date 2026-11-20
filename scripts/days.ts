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
 * The bot rests until the party is at 90% HP, then sends it down.
 */
import { heroNames, library } from "../src/content";
import { heroSheet } from "../src/sim/hero";
import { indexLibrary } from "../src/sim/library";
import {
  cantLaunch,
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

/** One bot decision. Returns the next state. */
function step(t: TownState): TownState {
  // Repair anything raided, then build defences, cheapest first.
  if (build) {
    for (const id of t.damaged) if (t.gold >= repairCost(ix, t, id)) t = repair(ix, t, id);
    const next = DEFENCES.map((id) => ({ id, lvl: nextLevel(ix, t, id) }))
      .filter((x) => x.lvl && !t.damaged.includes(x.id))
      .sort((a, b) => a.lvl!.cost - b.lvl!.cost)[0];
    if (next && t.gold >= next.lvl!.cost + 40) t = upgrade(ix, t, next.id);
  }
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
  t = setOrders(ix, t, { ...t.orders, targetFloor: Number(policy) });
  return launch(ix, t, heroNames);
}

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
    t = step(t);
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
} else {
  const firstRaid: number[] = [];
  let raids = 0;
  let beaten = 0;
  let lost = 0;
  let strength = 0;
  for (let i = 0; i < runs; i++) {
    const t = play(seed0 + i, false);
    const r = t.pit.filter((n) => n.outcome !== "held");
    raids += r.length;
    beaten += r.filter((n) => n.outcome === "repelled").length;
    lost += t.memorial.length;
    strength += t.pit.at(-1)?.strength ?? 0;
    firstRaid.push(r[0]?.day ?? Infinity);
  }
  firstRaid.sort((a, b) => a - b);
  const median = firstRaid[Math.floor(runs / 2)]!;
  console.log(
    `${runs} towns, ${days} days, policy ${policy}${build ? " + defences" : ""}:\n` +
      `  first raid (median): day ${median === Infinity ? "never" : median}\n` +
      `  raids per town: ${(raids / runs).toFixed(1)} (${((beaten / Math.max(1, raids)) * 100).toFixed(0)}% beaten off)\n` +
      `  heroes lost per town: ${(lost / runs).toFixed(1)}\n` +
      `  overflow strength on the last night: ${(strength / runs).toFixed(1)}`,
  );
}
