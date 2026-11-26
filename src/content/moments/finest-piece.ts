import { defineMoment } from "../types";

export default defineMoment({
  id: "finest-piece",
  name: "The finest piece",
  tags: ["noble"],
  floors: [1, 5],
  on: { kind: "room", rooms: ["treasure"] },
  chance: 0.25,
  once: false,
  text: "{hero} picks the finest piece out of the hoard by eye, as only someone raised among fine things can.",
  effects: [
    {
      type: "gift",
      gold: [10, 30],
      news: "{hero} sold a fine piece from the pit to an old acquaintance for {gold} gold.",
    },
    { type: "morale", amount: 2, reason: "had an eye for the finest piece again" },
  ],
});
