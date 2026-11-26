import { defineItem } from "../types";

// Found in the Diggings' tool stores. An old brass lamp that still lights the far corners.
export default defineItem({
  id: "miners-lamp",
  name: "Miner's Lamp",
  icon: { sheet: "loot-2", cell: 0 },
  slot: "offhand",
  value: 30,
  tags: ["tool", "metal"],
  passives: [
    { type: "modifySkill", skill: "scouting", amount: 8 },
    { type: "modifyStat", stat: "accuracy", amount: 1 },
  ],
});
