import { defineMotivation } from "../types";

export default defineMotivation({
  id: "glory",
  name: "Glory",
  blurb: "Wants songs sung about them.",
  weight: 1,
  rules: [
    { fact: "kills", amount: 1, per: 3, cap: 4, reason: "enjoyed the fighting" },
    { fact: "newFloors", amount: 4, cap: 8, reason: "went deeper than ever" },
    { fact: "retreated", amount: -5, reason: "hated turning back" },
    { fact: "sameOldFloor", amount: -3, reason: "bored of the same old floor" },
    // M6: a glory hound hates watching others go down without them.
    { fact: "benched", amount: -3, reason: "left behind while others went down" },
  ],
  favourites: [
    { building: "training-yard", weight: 3 },
    { building: "blacksmith", weight: 1 },
  ],
  // At low morale a glory hound may refuse to turn back.
  lowMorale: { refuseRetreat: 0.5 },
});
