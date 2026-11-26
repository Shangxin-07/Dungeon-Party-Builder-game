import { defineBackstory } from "../types";

export default defineBackstory({
  id: "deserter",
  name: "Deserter",
  text: "{name} walked away from a lord's war one night and kept walking until the road ran out at the pit.",
  weight: 2,
  alignments: { good: 0.5, evil: 1.5 },
  passives: [
    { type: "modifyStat", stat: "STR", amount: 1 },
    { type: "modifySkill", skill: "stealth", amount: 5 },
  ],
  tags: ["soldier", "deserter"],
});
