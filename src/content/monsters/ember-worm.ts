import { defineMonster } from "../types";

// The Ember Deeps: a worm as thick as a pit prop that swims through hot ash
// the way an eel swims through water. You see the ash heave before you see it.
export default defineMonster({
  id: "ember-worm",
  name: "Ember Worm",
  icon: { sheet: "ember-deeps", cell: 2 },
  power: 24,
  stats: { STR: 22, DEX: 10, END: 22, PER: 9, INT: 2, WIL: 12, CHA: 1 },
  overrides: { maxHp: 160 },
  weapon: { name: "burning maw", damageType: "fire", attack: 15 },
  row: "front",
  tags: ["beast", "ember-touched"],
  ai: "brute",
  research: {
    tricks: "Huge, and it sweeps the whole front line. Fire is its home; cold slows it down.",
  },
  abilities: { "tail-sweep": 1 },
  loot: "worm-loot",
  passives: [
    { type: "modifyStat", stat: "armor", amount: 2 },
    { type: "resist", damageType: "fire", percent: 100 },
    { type: "resist", damageType: "cold", percent: -25 },
  ],
});
