import { defineItem } from "../types";

export default defineItem({
  id: "wooden-shield",
  name: "Wooden Shield",
  slot: "offhand",
  value: 15,
  tags: ["shield"],
  salvage: { timber: 2 },
  abilities: ["shield-bash"],
  passives: [
    { type: "modifyStat", stat: "armor", amount: 1 },
    { type: "modifyStat", stat: "evasion", amount: 1 },
  ],
});
