import { defineRoom } from "../types";

// The Diggings: the cart tracks still run, downhill, into the dark.
export default defineRoom({
  id: "runaway-cart",
  name: "Cart track",
  behaviour: "trap",
  floors: [1, 1],
  weight: 1,
  descriptions: [
    "Rails run steeply down the tunnel. Somewhere above, a cart creaks.",
    "An old haulage way, rails and sleepers still in place.",
  ],
  trap: {
    springs: "A loaded ore cart breaks its chock and comes roaring down the rails",
    spotted: "an ore cart held on the slope by a rotten chock",
    hidden: 40,
    damage: [4, 8],
    damageType: "crushing",
    hits: "one",
  },
});
