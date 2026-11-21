import { defineItem } from "../types";

// Unholy (DESIGN.md §7): knucklebones strung on gut. Dark power for a caster,
// and it makes the people around you uneasy.
export default defineItem({
  id: "bone-charm",
  name: "Bone Charm",
  slot: "offhand",
  value: 55,
  tags: ["charm", "unholy"],
  passives: [
    { type: "modifyStat", stat: "spellPower", amount: 3 },
    { type: "modifyStat", stat: "mana", amount: 8 },
    { type: "modifyStat", stat: "CHA", amount: -2 },
  ],
});
