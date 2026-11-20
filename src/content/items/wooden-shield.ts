import { defineItem } from "../types";

export default defineItem({
  id: "wooden-shield",
  name: "Wooden Shield",
  slot: "offhand",
  value: 15,
  tags: ["shield"],
  passives: [
    { type: "modifyStat", stat: "armor", amount: 1 },
    { type: "modifyStat", stat: "evasion", amount: 1 },
  ],
});
