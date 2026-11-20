/**
 * Simulate many fights per floor and print how a fresh starter party fared:
 * a single fight, and a short trip of three fights in a row with no rest.
 *
 *   npm run balance               # 500 runs per floor, floors 1-3
 *   npm run balance -- 2000
 */
import { heroNames, library } from "../src/content";
import { balanceReport } from "../src/sim/balance";
import { floorPower } from "../src/sim/encounter";

const runs = Number(process.argv[2] ?? 500);
const pct = (n: number) => `${(n * 100).toFixed(0)}%`;
console.log(`Fresh starter party (one of each class), ${runs} runs per floor\n`);
console.log("                One fight           Three fights, no rest");
console.log("Floor  Power    Won   HP left       Survived  HP left  Deaths");
for (const floor of [1, 2, 3]) {
  const one = balanceReport(library, heroNames, floor, runs, 1);
  const three = balanceReport(library, heroNames, floor, runs, 3);
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
