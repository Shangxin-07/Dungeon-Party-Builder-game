import { defineMonster } from "../types";

// The first huge beast (DESIGN.md §17.8). It wallows half under the black water
// of the Flooded Shafts and only ever leaves to feed. Stone-hard hide nothing
// gets through until the Library has Studied its shed scales, and nearly deaf:
// a quiet party can walk right past it. It never turns up in ordinary fights,
// only in its wallow (content/lairs/mire-wallow.ts).
export default defineMonster({
  id: "mire-behemoth",
  name: "Mire Behemoth",
  power: 40,
  stats: { STR: 22, DEX: 6, END: 22, PER: 6, INT: 3, WIL: 14, CHA: 2 },
  overrides: { maxHp: 700 },
  weapon: { name: "crushing bulk", damageType: "crushing", attack: 26 },
  row: "front",
  tags: ["giant", "beast", "behemoth"],
  ai: "brute",
  abilities: { crush: 1, "tail-sweep": 1 },
  // Lives half under water: it hears almost nothing (M7.08, sneak missions).
  hearing: -25,
  ward: { name: "stone-hard hide", tier: 2 },
  research: {
    points: [80, 240],
    tricks:
      "Its hide turns any blade, but the scales lift where the neck meets the shoulder: a long point gets under them. It's slow to turn.",
  },
  passives: [
    { type: "modifyStat", stat: "armor", amount: 6 },
    { type: "resist", damageType: "slashing", percent: 40 },
    { type: "resist", damageType: "crushing", percent: 40 },
    { type: "resist", damageType: "poison", percent: 75 },
    { type: "resist", damageType: "cold", percent: 50 },
    { type: "resist", damageType: "fire", percent: 25 },
  ],
});
