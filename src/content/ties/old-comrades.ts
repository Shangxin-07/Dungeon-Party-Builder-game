import { defineTie } from "../types";

export default defineTie({
  id: "old-comrades",
  name: "old comrade",
  text: "{a} and {b} fought in the same war, and fall into step without a word.",
  between: [["soldier"], ["soldier"]],
  chance: 0.5,
  morale: { amount: 2, reason: "fought beside {other}, like old times" },
  passives: [{ type: "modifyStat", stat: "attack", amount: 2 }],
});
