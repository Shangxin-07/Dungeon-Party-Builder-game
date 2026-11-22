import { defineTrait } from "../types";

export default defineTrait({
  id: "inspiring",
  name: "Inspiring",
  description: "Pulled off a big fight: +1 command.",
  from: "bigWin",
  weight: 2,
  motivations: { glory: 2 },
  tone: "good",
  command: 1,
});
