import { defineTrait } from "../types";

export default defineTrait({
  id: "steady",
  name: "Steady",
  description: "Kept their head in a hard fight: heroes are half as likely to desert.",
  from: "bigWin",
  weight: 2,
  alignments: { good: 1.5 },
  motivations: { comrades: 1.5 },
  tone: "good",
  desert: 0.5,
});
