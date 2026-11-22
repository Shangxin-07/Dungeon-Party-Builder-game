import { defineTrait } from "../types";

// Only Good leaders turn this way after a loss (DESIGN.md §17.5).
export default defineTrait({
  id: "overcautious",
  name: "Overcautious",
  description: "Won't lose another: turns back 15% HP sooner than the orders say.",
  from: "lostSomeone",
  weight: 3,
  alignments: { neutral: 0, evil: 0 },
  tone: "bad",
  trips: 6,
  retreatEarly: 15,
});
