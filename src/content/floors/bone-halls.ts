import { defineFloor } from "../types";

export default defineFloor({
  id: "bone-halls",
  depth: 3,
  name: "The Bone Halls",
  rooms: [6, 8],
  fixedRooms: ["rest-spot"],
  capacity: 60,
  startPopulation: 50,
});
