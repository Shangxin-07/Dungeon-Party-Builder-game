import { defineRoom } from "../types";

export default defineRoom({
  id: "treasure-hoard",
  name: "Hoard",
  behaviour: "treasure",
  floors: [3, 10],
  weight: 2,
  descriptions: ["Something has been dragging shiny things back here for years."],
  loot: "rich-chest",
});
