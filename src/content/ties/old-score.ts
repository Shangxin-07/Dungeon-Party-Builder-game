import { defineTie } from "../types";

export default defineTie({
  id: "old-score",
  name: "old score",
  text: "{b} once ran goods past the toll of {a}'s family, and {a} has never let it go.",
  between: [["noble"], ["smuggler"]],
  chance: 0.6,
  morale: { amount: -2, reason: "shared a tunnel with {other}" },
});
