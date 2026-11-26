import { defineTie } from "../types";

export default defineTie({
  id: "prayer-partners",
  name: "prayer partner",
  text: "{a} and {b} keep the same prayers, morning and night.",
  between: [["faith"], ["faith", "graves"]],
  chance: 0.4,
  morale: { amount: 2, reason: "kept the prayers with {other}" },
  passives: [{ type: "modifyStat", stat: "resist", amount: 3 }],
});
