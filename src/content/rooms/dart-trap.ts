import { defineRoom } from "../types";

export default defineRoom({
  id: "dart-trap",
  name: "Narrow corridor",
  behaviour: "trap",
  floors: [1, 5],
  weight: 1.5,
  descriptions: ["The corridor narrows. The walls are full of little holes."],
  trap: {
    springs: "Click. A dart flies out of the wall",
    spotted: "a tripwire across the floor",
    hidden: 40,
    damage: [5, 9],
    damageType: "piercing",
    hits: "one",
  },
});
