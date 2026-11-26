import { defineMoment } from "../types";

export default defineMoment({
  id: "rune-notes",
  name: "Rune notes",
  tags: ["scholar"],
  floors: [4, 5],
  on: { kind: "room", rooms: ["crystal-grotto", "silver-vein", "flooded-gallery"] },
  chance: 0.35,
  once: false,
  text: "{hero} stops to copy the old marks cut into the rock, while the others keep watch and grumble.",
  effects: [
    {
      type: "gift",
      gold: [20, 45],
      news: "A scholar in the valley paid {gold} gold for {hero}'s notes on the deep marks.",
    },
    { type: "morale", amount: 3, reason: "copied marks nobody has read in centuries" },
  ],
});
