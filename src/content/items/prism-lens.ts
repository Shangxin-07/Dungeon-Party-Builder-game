import { defineItem } from "../types";

// The Glimmering: a disc of clear crystal cut by someone who knew how. Held up, it shows things true.
export default defineItem({
  id: "prism-lens",
  name: "Prism Lens",
  icon: { sheet: "glimmering", cell: 7 },
  slot: "offhand",
  value: 160,
  tags: ["tool"],
  passives: [
    { type: "modifySkill", skill: "scouting", amount: 10 },
    { type: "modifyStat", stat: "accuracy", amount: 2 },
    { type: "modifyStat", stat: "spellPower", amount: 2 },
  ],
});
