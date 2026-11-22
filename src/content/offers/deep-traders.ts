import { defineOffer } from "../types";

// Traders who've heard about the deep floors (M7.17): they pay well for
// what only the deep floors give, and sell better kit.
export default defineOffer({
  id: "deep-traders",
  kind: "caravan",
  name: "Traders from the city",
  text: "Traders from the city have come to see the famous pit. They pay well for glowcap and deep silver, and their wares aren't cheap.",
  weight: 1,
  days: 2,
  minDay: 20,
  buys: { glowcap: 18, "deep-silver": 30, timber: 6 },
  sells: [
    { item: "iron-staff", price: 85 },
    { item: "scale-mail", price: 140 },
    { item: "silver-ring", price: 45 },
    { item: "ward-stone", price: 180 },
  ],
});
