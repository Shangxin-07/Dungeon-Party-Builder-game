import { defineRoom } from "../types";

export default defineRoom({
  id: "old-chest",
  name: "Storeroom",
  behaviour: "treasure",
  floors: [1, 2],
  weight: 2,
  descriptions: [
    "A miners' storeroom. One chest is still shut.",
    "A chest, half buried in rubble.",
  ],
  loot: "small-chest",
});
