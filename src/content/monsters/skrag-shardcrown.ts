import { defineMonster } from "../types";

// Floor 1's shard-bearer (DESIGN.md §20): a goblin who found a warm stone in the
// rubble, hammered it into an iron crown, and grew. Keeps to the back tunnels:
// only a party hunting a thinned-out Diggings meets him. Built to beat a fresh
// party: a level 1 party of four loses heroes, a level 5 one doesn't.
export default defineMonster({
  id: "skrag-shardcrown",
  name: "Skrag Shardcrown",
  power: 30,
  stats: { STR: 15, DEX: 12, END: 14, PER: 10, INT: 8, WIL: 10, CHA: 11 },
  overrides: { maxHp: 380 },
  weapon: { name: "shard-studded maul", damageType: "crushing", attack: 17 },
  row: "front",
  tags: ["goblinoid", "humanoid", "cunning", "shard-bearer"],
  ai: "brute",
  research: {
    tricks: "The crown keeps him on his feet long past when he should drop. Bring everyone.",
  },
  loot: "goblin-loot",
  abilities: { "war-cry": 1, disarm: 1, "power-strike": 1 },
  passives: [{ type: "modifyStat", stat: "armor", amount: 3 }],
});
