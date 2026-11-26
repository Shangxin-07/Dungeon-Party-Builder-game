import { defineMoment } from "../types";

export default defineMoment({
  id: "stranded-cousin",
  name: "A familiar face",
  tags: ["camp-born"],
  floors: [2, 4],
  on: { kind: "room", rooms: ["cocooned-delver"] },
  chance: 0.4,
  text: "{hero} knows the face in the webs: a cousin from the camp. They cut them free with shaking hands.",
  effects: [
    {
      type: "gift",
      gold: [15, 30],
      news: "{hero}'s cousin, cut free in the Warrens, sent {gold} gold to the guild in thanks.",
    },
    { type: "morale", amount: 6, reason: "cut a cousin free from the webs" },
  ],
});
