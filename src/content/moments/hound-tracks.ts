import { defineMoment } from "../types";

export default defineMoment({
  id: "hound-tracks",
  name: "Hound tracks",
  tags: ["hunter"],
  floors: [2, 2],
  on: { kind: "floor" },
  chance: 0.3,
  once: false,
  text: "{hero} reads the hound tracks in the dust and keeps the party out of the worst of the runs. They rest easier for it.",
  effects: [
    { type: "heal", percent: 10, all: true },
    { type: "morale", amount: 2, reason: "read the Warrens like a valley wood" },
  ],
});
