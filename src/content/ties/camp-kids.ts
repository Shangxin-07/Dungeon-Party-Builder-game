import { defineTie } from "../types";

export default defineTie({
  id: "camp-kids",
  name: "childhood friend",
  text: "{a} and {b} grew up running the camp's tunnels together.",
  between: [["camp-born"], ["camp-born"]],
  chance: 0.5,
  morale: { amount: 2, reason: "went down with {other}, like when they were kids" },
  passives: [{ type: "modifyStat", stat: "initiative", amount: 1 }],
});
