import { defineMonster } from "../types";

// The Diggings: a beetle the size of a dog that lives on the miners' scrap iron.
export default defineMonster({
  id: "rust-beetle",
  name: "Rust Beetle",
  power: 3,
  stats: { STR: 9, DEX: 7, END: 12, PER: 6, INT: 2, WIL: 6, CHA: 1 },
  overrides: { maxHp: 24 },
  weapon: { name: "mandibles", damageType: "piercing", attack: 3 },
  row: "front",
  tags: ["beast", "vermin"],
  ai: "brute",
  research: { tricks: "A hard shell, and its bite rusts armour away. Crush it; blades skid off." },
  abilities: { "rust-bite": 1 },
  loot: "beetle-loot",
  passives: [
    { type: "modifyStat", stat: "armor", amount: 3 },
    { type: "resist", damageType: "slashing", percent: 25 },
    { type: "resist", damageType: "crushing", percent: -25 },
  ],
});
