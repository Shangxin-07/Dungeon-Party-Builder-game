import { defineFloor } from "../types";

export default defineFloor({
  id: "warrens",
  depth: 2,
  name: "The Warrens",
  rooms: [6, 8],
  fixedRooms: ["rest-spot"],
});
