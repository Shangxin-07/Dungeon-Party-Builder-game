import { defineMoment } from "../types";

export default defineMoment({
  id: "hearths-warmth",
  name: "The heart's warmth",
  tags: ["faith"],
  floors: [5, 5],
  on: { kind: "floor" },
  chance: 0.3,
  once: false,
  text: "{hero} feels the heart's warmth through the rock and prays aloud. For a moment the whole party feels it too.",
  effects: [
    { type: "heal", percent: 15, all: true },
    { type: "morale", amount: 4, reason: "felt the Hearthstone's warmth and prayed" },
  ],
});
