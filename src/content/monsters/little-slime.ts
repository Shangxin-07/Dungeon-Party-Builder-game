import { defineMonster } from "../types";

export default defineMonster({
  id: "little-slime",
  name: "Little Slime",
  power: 1,
  stats: { STR: 4, DEX: 5, END: 4, PER: 3, INT: 1, WIL: 3, CHA: 1 },
  overrides: { maxHp: 10 },
  weapon: { name: "pseudopod", damageType: "crushing", attack: 2 },
  row: "front",
  tags: ["ooze"],
  ai: "brute",
  summonOnly: true,
});
