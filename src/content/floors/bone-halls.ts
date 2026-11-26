import { defineFloor } from "../types";

export default defineFloor({
  id: "bone-halls",
  depth: 3,
  name: "The Bone Halls",
  rooms: [6, 8],
  fixedRooms: ["rest-spot"],
  capacity: 60,
  startPopulation: 50,
  // The town's old ossuaries. The cold of the grave gets into the hands (§21).
  ground: {
    name: "Grave cold",
    description:
      "The cold of the ossuaries gets into living hands: heroes are slower (-2 initiative).",
    text: "The grave cold of the Halls gets into the party's hands.",
    heroes: [{ type: "modifyStat", stat: "initiative", amount: -2 }],
  },
});
