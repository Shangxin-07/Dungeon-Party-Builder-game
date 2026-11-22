import { defineTrait } from "../types";

// Losing someone doesn't break everyone: Evil leaders above all.
export default defineTrait({
  id: "hardened",
  name: "Hardened",
  description: "Has buried friends before: the party's morale losses are 10% lighter.",
  from: "lostSomeone",
  weight: 1,
  alignments: { evil: 3, good: 0.5 },
  motivations: { glory: 1.5, comrades: 0.3 },
  tone: "good",
  moraleLoss: -10,
});
