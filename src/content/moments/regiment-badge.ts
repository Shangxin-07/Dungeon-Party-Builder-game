import { defineMoment } from "../types";

export default defineMoment({
  id: "regiment-badge",
  name: "The regiment's badge",
  tags: ["deserter"],
  floors: [3, 3],
  on: { kind: "floor" },
  chance: 0.2,
  text: "Among the bones {hero} finds an old badge of their own regiment. Someone else walked away from the war, and only got this far.",
  effects: [
    { type: "morale", amount: -4, reason: "found a deserter's bones with their regiment's badge" },
  ],
});
