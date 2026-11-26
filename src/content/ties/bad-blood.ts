import { defineTie } from "../types";

export default defineTie({
  id: "bad-blood",
  name: "bad blood",
  text: "{a} and {b} come from either side of the old goblin raids on the camp, and neither forgets it.",
  between: [["goblin-raised"], ["miner-kin", "camp-born"]],
  chance: 0.6,
  morale: { amount: -3, reason: "had to trust {other} at their back" },
  passives: [{ type: "modifyStat", stat: "initiative", amount: -1 }],
});
