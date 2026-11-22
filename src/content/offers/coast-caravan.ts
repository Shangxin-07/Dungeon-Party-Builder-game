import { defineOffer } from "../types";

// The usual caravan (M7.17): the only buyer in town for spare materials.
export default defineOffer({
  id: "coast-caravan",
  kind: "caravan",
  name: "A caravan from the coast",
  text: "A caravan from the coast has pulled up by the Market. They'll buy ore, silk and bone dust, and they have a few things the Market doesn't.",
  weight: 3,
  days: 2,
  buys: { "iron-ore": 9, "spider-silk": 14, "bone-dust": 15, planks: 5 },
  sells: [
    { item: "greater-healing-potion", price: 55 },
    { item: "longbow", price: 80 },
    { item: "war-axe", price: 90 },
    { item: "lucky-charm", price: 150 },
  ],
});
