import { defineOffer } from "../types";

export default defineOffer({
  id: "seed-corn",
  kind: "petition",
  name: "Seed corn",
  text: "A peddler has sacks of seed corn. The farmers say it would fill the stores for weeks.",
  weight: 1,
  days: 3,
  needs: "farm",
  gold: 30,
  effect: { type: "food", amount: 20 },
});
