import { defineMonster } from "../types";

// The Flooded Shafts: a pale eel as long as a man, that lives in the drowned galleries and strikes from the water.
export default defineMonster({
  id: "shaft-eel",
  name: "Shaft Eel",
  power: 6,
  stats: { STR: 11, DEX: 15, END: 9, PER: 12, INT: 2, WIL: 6, CHA: 1 },
  overrides: { maxHp: 30 },
  weapon: { name: "needle teeth", damageType: "piercing", attack: 6 },
  row: "front",
  tags: ["beast", "ambusher"],
  ai: "brute",
  research: {
    tricks:
      "Strikes from the water before anyone sees it, and its bite bleeds. A scout spots the ripple.",
  },
  abilities: { gnaw: 1 },
  loot: "eel-loot",
  passives: [{ type: "resist", damageType: "cold", percent: 25 }],
});
