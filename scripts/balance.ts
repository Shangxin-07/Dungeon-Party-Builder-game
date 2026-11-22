/**
 * Simulate many fights and expeditions per floor and print how a fresh starter
 * party fared.
 *
 *   npm run balance               # 500 runs each, floors 1-3
 *   npm run balance -- 2000
 *   npm run balance -- 500 fighter,cleric,mage    # a different party
 *
 * Hours/floor and Days (M7.01, content/time.ts) count trips that did what they
 * were told: a floor should take about a day, there and back.
 */
import { heroNames, library } from "../src/content";
import { balanceReport, expeditionReport } from "../src/sim/balance";
import { floorPower } from "../src/sim/encounter";
import type { RetreatRule } from "../src/sim/expedition";

const runs = Number(process.argv[2] ?? 500);
const party = process.argv[3]?.split(",");
const pct = (n: number) => `${(n * 100).toFixed(0)}%`;
console.log(
  `Fresh starter party (${party ? party.join(", ") : "fighter, scout, mage"}), ${runs} runs each\n`,
);
console.log("Single fights, and three fights in a row with no rest");
console.log("                One fight           Three fights, no rest");
console.log("Floor  Power    Won   HP left       Survived  HP left  Deaths");
for (const floor of [1, 2, 3]) {
  const one = balanceReport(library, heroNames, floor, runs, 1, party);
  const three = balanceReport(library, heroNames, floor, runs, 3, party);
  console.log(
    [
      String(floor).padEnd(6),
      String(floorPower(floor)).padEnd(8),
      pct(one.survived).padEnd(5),
      pct(one.hpLeft).padEnd(13),
      pct(three.survived).padEnd(9),
      pct(three.hpLeft).padEnd(8),
      three.deaths.toFixed(2),
    ].join(" "),
  );
}

const rules: [string, RetreatRule][] = [
  ["below 30% HP", { kind: "hero-hp-below", percent: 30 }],
  ["never", { kind: "never" }],
];
for (const [label, retreat] of rules) {
  console.log(`\nFull expeditions, retreat rule: ${label}`);
  console.log(
    "Target  Returned  Retreated  Wiped  Deaths  Fights  Haul  Dropped  Hours/floor  Days",
  );
  for (const targetFloor of [1, 2, 3]) {
    const orders = { targetFloor, retreat, loot: "everything" } as const;
    const r = expeditionReport(library, heroNames, orders, runs, party);
    console.log(
      [
        String(targetFloor).padEnd(7),
        pct(r.returned).padEnd(9),
        pct(r.retreated).padEnd(10),
        pct(r.wiped).padEnd(6),
        r.deaths.toFixed(2).padEnd(7),
        r.fights.toFixed(1).padEnd(7),
        r.haul.toFixed(0).padEnd(5),
        r.dropped.toFixed(1).padEnd(8),
        (r.hours / targetFloor).toFixed(1).padEnd(12),
        r.days.toFixed(2),
      ].join(" "),
    );
  }
}
