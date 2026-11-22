import { defineItem } from "../types";

// A blessed silver sun on a chain (DESIGN.md §7). Clerics and paladins like
// holy things, and the undead like them even less.
export default defineItem({
  id: "holy-symbol",
  name: "Holy Symbol",
  slot: "offhand",
  value: 45,
  tags: ["holy", "symbol"],
  salvage: { "deep-silver": 1 },
  passives: [
    { type: "modifyStat", stat: "spellPower", amount: 2 },
    { type: "modifyStat", stat: "resist", amount: 2 },
    { type: "bonusVsTag", tag: "undead", percent: 15 },
  ],
});
