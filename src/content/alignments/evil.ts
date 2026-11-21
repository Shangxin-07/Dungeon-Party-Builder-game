import { defineAlignment } from "../types";

export default defineAlignment({
  id: "evil",
  name: "Evil",
  blurb: "In it for themselves, and enjoys the killing a little too much.",
  position: -1,
  weight: 25,
  rules: [
    { fact: "goldShare", amount: 1, per: 30, cap: 3, reason: "a fat purse" },
    { fact: "kills", amount: 1, per: 3, cap: 2, reason: "enjoyed the killing" },
    { fact: "fallenComrades", amount: 1, cap: 2, reason: "a bigger share now" },
    // In the dungeon (content/events/) and the gear they carry.
    { fact: "evilDeeds", amount: 1, cap: 2, reason: "had some fun" },
    { fact: "goodDeeds", amount: -1, cap: 2, reason: "wasted time being kind" },
    { fact: "unholyGear", amount: 1, reason: "likes the dark gear" },
  ],
});
