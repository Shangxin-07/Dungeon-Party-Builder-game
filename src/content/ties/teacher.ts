import { defineTie } from "../types";

export default defineTie({
  id: "teacher",
  name: "teacher",
  text: "{a} has been teaching {b} their letters by lamplight.",
  between: [["scholar"], ["farm", "orphan", "goblin-raised"]],
  chance: 0.35,
  morale: { amount: 2, reason: "had a lesson with {other} between fights" },
});
