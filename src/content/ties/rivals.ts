import { defineTie } from "../types";

export default defineTie({
  id: "rivals",
  name: "rival",
  text: "{a} and {b} have kept count of each other's kills since the day they met.",
  between: [
    ["hunter", "soldier"],
    ["hunter", "soldier", "smuggler"],
  ],
  chance: 0.25,
  passives: [{ type: "modifyStat", stat: "attack", amount: 1 }],
});
