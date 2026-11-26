import { defineMonster } from "../types";

// The Warrens: a long-legged spider that hangs in the roof of the burrows and drops on the leader.
export default defineMonster({
  id: "web-lurker",
  name: "Web Lurker",
  icon: { sheet: "monsters-3", cell: 3 },
  power: 5,
  stats: { STR: 9, DEX: 14, END: 8, PER: 13, INT: 4, WIL: 8, CHA: 1 },
  overrides: { maxHp: 26 },
  weapon: { name: "fangs", damageType: "piercing", attack: 4 },
  row: "front",
  tags: ["beast", "ambusher", "cunning"],
  ai: "brute",
  research: {
    tricks:
      "Hangs in the roof and drops on whoever leads, then webs them. Scouts who look up spoil it.",
  },
  abilities: { web: 1, "venom-bite": 1 },
  loot: "spider-loot",
  passives: [{ type: "resist", damageType: "poison", percent: 100 }],
});
