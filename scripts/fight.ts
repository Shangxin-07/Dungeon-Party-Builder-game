/**
 * Run one fight from the command line and print the battle report.
 *
 *   npm run fight                      # floor 1, seed 1
 *   npm run fight -- --floor 3 --seed 42
 *   npm run fight -- --monsters skeleton,skeleton
 */
import { heroNames, library } from "../src/content";
import { runCombat } from "../src/sim/combat";
import { rollEncounter } from "../src/sim/encounter";
import { createStarterParty, heroSheet } from "../src/sim/hero";
import { indexLibrary } from "../src/sim/library";
import { createRng } from "../src/sim/rng";
import { validateLibrary } from "../src/sim/validate";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const errors = validateLibrary(library);
if (errors.length) {
  console.error("Content problems:\n" + errors.map((e) => `  - ${e}`).join("\n"));
  process.exit(1);
}

const seed = Number(arg("seed") ?? 1);
const floor = Number(arg("floor") ?? 1);
const ix = indexLibrary(library);
const rng = createRng(seed);
const party = createStarterParty(ix, heroNames, rng);
const monsters = arg("monsters")?.split(",") ?? rollEncounter(ix, floor, rng);

console.log(`Seed ${seed}, floor ${floor}\n`);
for (const h of party) {
  const s = heroSheet(ix, h);
  const stats = Object.entries(s.stats)
    .map(([k, v]) => `${k} ${v}`)
    .join(" ");
  console.log(`  ${h.name.padEnd(8)} ${ix.cls(h.classId).name.padEnd(8)} HP ${h.hp}  ${stats}`);
}
console.log("");

const result = runCombat(ix, party, monsters, { seed });
for (const e of result.log) {
  if (e.kind === "round") console.log(`\n-- ${e.text} --`);
  else console.log(`  ${e.text}`);
}

console.log("\nAfter the fight:");
for (const h of result.party) {
  const max = heroSheet(ix, h).derived.maxHp;
  console.log(`  ${h.name.padEnd(8)} ${String(h.hp).padStart(3)}/${max} HP  ${h.condition}`);
}
