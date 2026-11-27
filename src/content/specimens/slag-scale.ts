import { defineItem } from "../types";

// A specimen: a plate of a slag crawler's shell, black glass outside and red at the core.
export default defineItem({
  id: "slag-scale",
  name: "Slag Crawler's Scale",
  slot: "loot",
  value: 5,
  tags: ["specimen"],
  research: { points: 15, monsters: ["slag-crawler"] },
});
