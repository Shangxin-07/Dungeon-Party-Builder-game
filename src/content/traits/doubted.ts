import { defineTrait } from "../types";

export default defineTrait({
  id: "doubted",
  name: "Doubted",
  description:
    "Someone ran out on them: for the next 3 trips the party is unruly, as if half a hero over command.",
  from: "deserted",
  weight: 1,
  tone: "bad",
  trips: 3,
  unruly: 0.5,
});
