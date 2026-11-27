import { defineItem } from "../types";

// The Keepers' Stair: a warden's stone forearm, broken off and bound with a grip. Heavy.
export default defineItem({
  id: "warden-maul",
  name: "Warden's Maul",
  icon: { sheet: "keepers", cell: 6 },
  slot: "weapon",
  value: 140,
  tags: ["mace", "melee", "heavy"],
  damageType: "crushing",
  passives: [
    { type: "modifyStat", stat: "attack", amount: 7 },
    { type: "modifyStat", stat: "initiative", amount: -1 },
    { type: "bonusVsTag", tag: "construct", percent: 30 },
  ],
});
