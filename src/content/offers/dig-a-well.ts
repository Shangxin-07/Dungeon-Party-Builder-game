import { defineOffer } from "../types";

// The townsfolk ask for something (M7.17): grant it and more of them settle.
export default defineOffer({
  id: "dig-a-well",
  kind: "petition",
  name: "Dig a well",
  text: "The settlers ask for a well of their own. Pay for it and word gets round: a couple more families will come.",
  weight: 2,
  days: 4,
  needs: "cottages",
  minFolk: 2,
  gold: 60,
  effect: { type: "folk", count: 2 },
});
