import { defineBackstory } from "../types";

export default defineBackstory({
  id: "temple-orphan",
  name: "Temple orphan",
  text: "Left on the Temple steps as a baby. {name} was raised on prayers and porridge, and still says grace.",
  weight: 2,
  alignments: { good: 2, evil: 0.3 },
  passives: [
    { type: "modifyStat", stat: "WIL", amount: 1 },
    { type: "modifySkill", skill: "medicine", amount: 5 },
  ],
  tags: ["faith", "orphan"],
});
