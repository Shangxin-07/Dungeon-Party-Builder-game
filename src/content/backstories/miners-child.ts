import { defineBackstory } from "../types";

export default defineBackstory({
  id: "miners-child",
  name: "Miner's child",
  text: "Born in the camp. {name}'s father went down to the Old Delve with the last shift and never came up.",
  weight: 3,
  passives: [
    { type: "modifyStat", stat: "END", amount: 1 },
    { type: "modifySkill", skill: "lore", amount: 5 },
  ],
  tags: ["miner-kin", "camp-born"],
});
