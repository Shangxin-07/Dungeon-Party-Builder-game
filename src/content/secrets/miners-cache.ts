import { defineSecret } from "../types";

export default defineSecret({
  id: "miners-cache",
  name: "Miner's cache",
  floors: [1, 2],
  weight: 3,
  hidden: 50,
  spotted: "a loose stone in the wall, and a miner's savings behind it",
  loot: "hidden-cache",
});
