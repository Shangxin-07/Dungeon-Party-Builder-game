import { defineBackstory } from "../types";

export default defineBackstory({
  id: "goblin-raised",
  name: "Raised by goblins",
  text: "Lost as a child and found years later in a goblin warren. {name} still eats like one.",
  weight: 1,
  alignments: { good: 0.5, evil: 1.5 },
  passives: [
    { type: "modifyStat", stat: "DEX", amount: 1 },
    { type: "modifySkill", skill: "stealth", amount: 8 },
  ],
  tags: ["goblin-raised"],
});
