import { defineBuilding } from "../types";

/** Quiet ground behind the Guild Hall (DESIGN.md §8, §10). The fallen rest here. */
export default defineBuilding({
  id: "graveyard",
  name: "Graveyard",
  blurb: "Somewhere to lay the fallen to rest. Their friends take comfort in it.",
  startLevel: 0,
  levels: [
    {
      cost: 60,
      days: 1,
      summary: "Bury the dead (5 gold each): the whole guild takes heart",
      effects: [{ type: "burial", gold: 5 }],
    },
  ],
  // Its look on the town map (M8, DESIGN.md §19).
  art: { plot: "far-west", shape: "graves", sprite: { sheet: "graveyard", frames: [0] } },
});
