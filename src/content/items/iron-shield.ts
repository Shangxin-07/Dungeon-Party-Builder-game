import { defineItem } from "../types";

export default defineItem({
  id: "iron-shield",
  name: "Iron Shield",
  slot: "offhand",
  value: 45,
  tags: ["shield", "heavy"],
  salvage: { "iron-ore": 3 },
  abilities: ["shield-bash"],
  passives: [
    { type: "modifyStat", stat: "armor", amount: 2 },
    { type: "modifyStat", stat: "evasion", amount: 1 },
  ],
});
