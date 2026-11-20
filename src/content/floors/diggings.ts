import { defineFloor } from "../types";

export default defineFloor({
  id: "diggings",
  depth: 1,
  name: "The Diggings",
  rooms: [5, 7],
  fixedRooms: ["rest-spot"],
  capacity: 40,
  startPopulation: 28,
});
