import { defineMonster } from "../types";

// One of floor 8's shard-bearers (M8.40, DESIGN.md §21): ash and slag heaped
// up into the shape of a man by the heat coming off a shard of the Emberstone
// buried in its chest. When it moves, the heat comes off it in waves.
export default defineMonster({
  id: "ash-colossus",
  name: "The Ash Colossus",
  icon: { sheet: "ember-deeps", cell: 5 },
  power: 100,
  stats: { STR: 25, DEX: 6, END: 25, PER: 10, INT: 4, WIL: 18, CHA: 1 },
  overrides: { maxHp: 1500 },
  weapon: { name: "slag fists", damageType: "crushing", attack: 42 },
  row: "front",
  tags: ["construct", "ember-touched", "shard-bearer"],
  ai: "brute",
  research: {
    tricks:
      "Huge and slow; heat rolls off it over the whole party, and its ash dazes. Fire feeds it; cold cracks it.",
  },
  loot: "slag-heap",
  abilities: { crush: 1, "heat-blast": 1, "choking-ash": 1 },
  passives: [
    { type: "modifyStat", stat: "armor", amount: 5 },
    { type: "modifyStat", stat: "initiative", amount: -3 },
    { type: "resist", damageType: "fire", percent: 100 },
    { type: "resist", damageType: "poison", percent: 100 },
    { type: "resist", damageType: "slashing", percent: 20 },
    { type: "resist", damageType: "cold", percent: -15 },
  ],
});
