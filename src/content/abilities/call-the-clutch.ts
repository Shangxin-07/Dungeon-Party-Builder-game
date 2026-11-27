import { defineAbility } from "../types";

// The Vein Mother. Once a fight, her clutch crawls out of the walls.
export default defineAbility({
  id: "call-the-clutch",
  name: "Call the Clutch",
  description: "Once a fight: two crystal crawlers join the fight.",
  verb: "grinds its mandibles, and the walls crack open",
  target: "self",
  perFight: 1,
  tags: ["summon"],
  effects: [{ type: "summon", monster: "crystal-crawler", count: 2 }],
});
