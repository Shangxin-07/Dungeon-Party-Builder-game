import { defineTrait } from "../types";

export default defineTrait({
  id: "haunted",
  name: "Haunted",
  description: "Lost someone and can't let it go: −1 command, and the party takes bad news harder.",
  from: "lostSomeone",
  weight: 3,
  alignments: { good: 0.7 },
  motivations: { comrades: 2 },
  tone: "bad",
  trips: 6,
  command: -1,
  moraleLoss: 15,
});
