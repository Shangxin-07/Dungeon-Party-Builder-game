import { defineSealingRules } from "./types";

/**
 * Forging Seal Stones (M8.17, DESIGN.md §20): every shard of a floor, made
 * into one stone at the Temple or the Black Market. Both seal the stairs the
 * same way for now; what else each does (blessings, gateways) comes later.
 */
export default defineSealingRules({
  hours: 4,
  ways: [
    {
      id: "cleansed",
      name: "Cleansed",
      workshop: "temple",
      stat: "WIL",
      fact: "goodDeeds",
      blurb: "The priests burn the wrongness out of the shards and set them in one quiet stone.",
    },
    {
      id: "bound",
      name: "Bound",
      workshop: "black-market",
      stat: "INT",
      fact: "evilDeeds",
      blurb:
        "The shards are bound together still burning, their hunger turned on whatever's below.",
    },
  ],
});
