import { defineBuilding } from "../types";

/** A strongroom for the guild's gold (DESIGN.md §8). Gold-minded heroes love it. */
export default defineBuilding({
  id: "vault",
  name: "Vault",
  blurb: "A locked strongroom. Raiders can't get at what's inside.",
  startLevel: 0,
  levels: [
    {
      cost: 140,
      days: 2,
      summary: "Raiders can't touch half the guild's gold",
      effects: [{ type: "vault", amount: 50 }],
    },
    {
      cost: 300,
      materials: { "iron-ore": 6 },
      days: 4,
      summary: "Raiders can't touch any of the guild's gold",
      effects: [{ type: "vault", amount: 100 }],
    },
  ],
});
