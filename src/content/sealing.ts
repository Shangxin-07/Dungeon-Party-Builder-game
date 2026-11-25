import { defineSealingRules } from "./types";

/**
 * Forging Seal Stones (M8.17, DESIGN.md §20): every shard of a floor, made
 * into one stone at the Temple or the Black Market. Both seal the stairs the
 * same way for now; blessings come later. A set stone becomes a gateway
 * (M8.18) that the town sets to Shut, Trickle or Open.
 */
export default defineSealingRules({
  hours: 4,
  gateway: {
    settings: {
      shut: {
        name: "Shut",
        blurb:
          "Nothing comes up. The floor below fills to half again its capacity and leans on the stone.",
      },
      trickle: {
        name: "Trickle",
        blurb:
          "A few weak ones come up each day, so the floor above always has something to hunt: a training floor for new heroes.",
      },
      open: {
        name: "Open",
        blurb: "Everything comes up as if the stone weren't there. Nothing strains it.",
      },
    },
    // Three a day at the level of the floor above; the rest held back, at half the strain.
    trickle: { perDay: 3, strain: 0.5 },
    // A floor 2 penned at half again its capacity (25 over) strains floor 1's
    // gateway by 1 a day: a level-1 gateway left Shut breaches in about a month.
    strainPerMonster: 0.04,
    ease: 1,
    warnAt: 0.75,
    levels: [
      {
        limit: 30,
        repair: { gold: 60, materials: { planks: 4, "iron-bands": 2 } },
        summary: "The stone alone, wedged in the stairs.",
      },
      {
        limit: 60,
        gold: 150,
        materials: { planks: 6, "iron-bands": 4 },
        repair: { gold: 90, materials: { planks: 6, "iron-bands": 3 } },
        summary: "A timber frame and iron bands round the stone: twice the strain.",
      },
      {
        limit: 100,
        gold: 300,
        materials: { "iron-bands": 6, "deep-silver": 2 },
        repair: { gold: 140, materials: { "iron-bands": 4, "deep-silver": 1 } },
        summary: "Deep-silver set in the arch, the rune-ore the stone was cut from.",
      },
    ],
  },
  ways: [
    {
      id: "cleansed",
      name: "Cleansed",
      workshop: "temple",
      stat: "WIL",
      fact: "goodDeeds",
      blurb: "The priests burn the wrongness out of the shards and set them in one quiet stone.",
      // Holy and gentle (DESIGN.md §20): wounds close faster, the dead lie stiller.
      blessing: {
        name: "Quiet earth",
        text: "Injuries mend half a day faster each day, and the unburied dead lie 3 days longer before they rise.",
        effects: [
          { type: "healing", amount: 0.5 },
          { type: "riseDelay", amount: 3 },
        ],
      },
    },
    {
      id: "bound",
      name: "Bound",
      workshop: "black-market",
      stat: "INT",
      fact: "evilDeeds",
      blurb:
        "The shards are bound together still burning, their hunger turned on whatever's below.",
      // Stronger, at a price (DESIGN.md §20): more for the haul, and the
      // monsters fear the town. Good heroes feel the stone's hunger every day.
      blessing: {
        name: "Hungry stone",
        text: "Hauls sell for 5 points more, and what climbs out of the pit fears the town (4 defence). Good heroes lose a little morale each day.",
        effects: [
          { type: "fence", amount: 5 },
          { type: "defence", amount: 4 },
        ],
      },
    },
  ],
});
