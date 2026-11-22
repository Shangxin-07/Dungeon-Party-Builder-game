import { defineTrait } from "../types";

export default defineTrait({
  id: "trusted",
  name: "Trusted",
  description:
    "Brings everyone home: heroes two steps from their alignment cost 1.5 command, not 2.",
  from: "longStreak",
  weight: 1,
  tone: "good",
  farCost: 1.5,
});
