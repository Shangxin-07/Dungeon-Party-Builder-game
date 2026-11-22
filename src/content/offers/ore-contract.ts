import { defineOffer } from "../types";

export default defineOffer({
  id: "ore-contract",
  kind: "contract",
  name: "Ore for the foundry",
  text: "A foundry down the valley is short of iron ore and will pay well for some, if it comes soon.",
  weight: 2,
  days: 3,
  wants: { "iron-ore": 6 },
  reward: 100,
  deadline: 10,
});
