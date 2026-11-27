import { defineItem } from "../types";

// The Kiln: a shield of fired tiles on a bronze frame, made by the Keepers to stand near the stone.
export default defineItem({
  id: "kiln-fired-shield",
  name: "Kiln-Fired Shield",
  icon: { sheet: "kiln", cell: 8 },
  slot: "offhand",
  value: 220,
  tags: ["shield"],
  abilities: ["shield-bash"],
  passives: [
    { type: "modifyStat", stat: "armor", amount: 4 },
    { type: "modifyStat", stat: "evasion", amount: 1 },
    { type: "resist", damageType: "fire", percent: 30 },
  ],
});
