import { defineFloor } from "../types";

export default defineFloor({
  id: "warrens",
  depth: 2,
  name: "The Warrens",
  rooms: [6, 8],
  fixedRooms: ["rest-spot"],
  capacity: 50,
  startPopulation: 38,
  // Burrows dug by beasts, not miners: heroes have no room to dodge (§21).
  ground: {
    name: "Tight tunnels",
    description:
      "Burrows dug by beasts, not miners. Heroes have no room to dodge (-2 evasion); the things that dug them do.",
    text: "The burrow is tight: there's no room to dodge.",
    heroes: [{ type: "modifyStat", stat: "evasion", amount: -2 }],
  },
});
