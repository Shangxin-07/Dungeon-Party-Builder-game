import { defineMonster } from "../types";

// The Ember Deeps: a great crawling thing with a shell of cooled slag, molten
// where it cracks. It spits the stuff, and it eats through iron.
export default defineMonster({
  id: "slag-crawler",
  name: "Slag Crawler",
  icon: { sheet: "ember-deeps", cell: 0 },
  power: 18,
  stats: { STR: 19, DEX: 9, END: 20, PER: 10, INT: 3, WIL: 12, CHA: 1 },
  overrides: { maxHp: 120 },
  weapon: { name: "molten mandibles", damageType: "fire", attack: 13 },
  row: "front",
  tags: ["beast", "ember-touched"],
  ai: "brute",
  research: {
    tricks: "Hard-shelled, fire can't touch it, and its spit eats armour. Cold cracks the slag.",
  },
  abilities: { "slag-spit": 1 },
  loot: "slag-loot",
  passives: [
    { type: "modifyStat", stat: "armor", amount: 4 },
    { type: "resist", damageType: "fire", percent: 100 },
    { type: "resist", damageType: "cold", percent: -30 },
  ],
});
