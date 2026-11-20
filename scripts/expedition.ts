/**
 * Run one expedition from the command line and print the trip report.
 *
 *   npm run expedition                         # floor 1, seed 1
 *   npm run expedition -- --floor 3 --seed 42
 *   npm run expedition -- --floor 2 --retreat never --loot valuable
 *
 * --retreat: hp-30 (default), downed, potions, never
 */
import { heroNames, library } from "../src/content";
import { runExpedition, type RetreatRule, type StandingOrders } from "../src/sim/expedition";
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

const retreats: Record<string, RetreatRule> = {
  "hp-30": { kind: "hero-hp-below", percent: 30 },
  downed: { kind: "hero-downed" },
  potions: { kind: "out-of-potions" },
  never: { kind: "never" },
};
const seed = Number(arg("seed") ?? 1);
const orders: StandingOrders = {
  targetFloor: Number(arg("floor") ?? 1),
  retreat: retreats[arg("retreat") ?? "hp-30"] ?? retreats["hp-30"]!,
  loot: arg("loot") === "valuable" ? "valuable" : "everything",
};
const ix = indexLibrary(library);
const party = createStarterParty(ix, heroNames, createRng(seed));

console.log(`Seed ${seed}\n`);
for (const h of party) {
  const s = heroSheet(ix, h);
  const skills = Object.entries(s.skills)
    .map(([k, v]) => `${k} ${v}`)
    .join(", ");
  console.log(`  ${h.name.padEnd(8)} ${ix.cls(h.classId).name.padEnd(8)} HP ${h.hp}  ${skills}`);
}

const r = runExpedition(ix, party, orders, seed);
let room = "";
for (const e of r.log) {
  if (e.kind === "floor") console.log(`\n== ${e.text} ==`);
  else if (e.kind === "room") {
    room = `${e.floor}-${e.room}`;
    console.log(`\n[${room}] ${e.text}`);
  } else if (e.kind === "combat") {
    if (e.combat?.kind !== "round") console.log(`      ${e.text}`);
  } else console.log(`  ${e.text}`);
}

console.log(`\nOutcome: ${r.outcome}. Deepest floor ${r.deepestFloor}, ${r.days} days.`);
for (const h of r.party) {
  const max = heroSheet(ix, h).derived.maxHp;
  console.log(`  ${h.name.padEnd(8)} ${String(h.hp).padStart(3)}/${max} HP  ${h.condition}`);
}
const real = r.haul.reduce((s, h) => s + h.value, 0);
const guess = r.haul.reduce((s, h) => s + h.estimate, 0);
console.log(`Haul: ${r.haul.length} items, the party thinks ~${guess} coins, really ${real}.`);
for (const h of r.haul) {
  console.log(`  ${ix.item(h.item).name}: guessed ${h.estimate}, worth ${h.value}`);
}
