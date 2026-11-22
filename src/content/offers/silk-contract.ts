import { defineOffer } from "../types";

export default defineOffer({
  id: "silk-contract",
  kind: "contract",
  name: "Silk for the weavers",
  text: "The weavers' guild has heard what the spiders spin down there, and wants some.",
  weight: 2,
  days: 3,
  minDay: 5,
  wants: { "spider-silk": 5 },
  reward: 120,
  deadline: 12,
});
