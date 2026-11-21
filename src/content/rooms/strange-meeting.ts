import { defineRoom } from "../types";

// An event room (DESIGN.md §7): one of content/events/, played out by the
// party's alignment.
export default defineRoom({
  id: "strange-meeting",
  name: "Side passage",
  behaviour: "event",
  floors: [1, 5],
  weight: 1.5,
  descriptions: [
    "Something up ahead isn't a monster.",
    "The party stops. There's something here they have to decide about.",
  ],
});
