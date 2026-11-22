import { defineBuilding } from "../types";

/**
 * The Guild Hall sets the most heroes that can go down together and how many
 * the guild can keep (DESIGN.md §8). Since M7.05 a party's leader decides how
 * many follow orders well (§17.5); the hall is the hard cap. More levels are
 * just more rows.
 */
export default defineBuilding({
  id: "guild-hall",
  name: "Guild Hall",
  blurb: "Where parties are put together. A bigger hall means bigger parties.",
  startLevel: 1,
  raidProof: true,
  levels: [
    {
      // Only paid for at the mining camp (content/opening.ts); other games start
      // with it. Timber only: the camp's gold goes on the palisade, so no build
      // order can leave the guild without a hall.
      cost: 0,
      materials: { timber: 6 },
      days: 3,
      summary: "4 heroes per party, 8 on the roster",
      effects: [
        { type: "partySlots", amount: 4 },
        { type: "rosterSize", amount: 8 },
      ],
    },
    {
      cost: 300,
      days: 3,
      summary: "5 heroes per party, 10 on the roster",
      effects: [
        { type: "partySlots", amount: 5 },
        { type: "rosterSize", amount: 10 },
      ],
    },
    {
      cost: 600,
      materials: { "iron-ore": 6, "spider-silk": 3 },
      days: 5,
      summary: "6 heroes per party, 12 on the roster",
      effects: [
        { type: "partySlots", amount: 6 },
        { type: "rosterSize", amount: 12 },
      ],
    },
    {
      cost: 1000,
      materials: { "iron-ore": 10, "spider-silk": 6 },
      days: 7,
      summary: "8 heroes per party, 16 on the roster",
      effects: [
        { type: "partySlots", amount: 8 },
        { type: "rosterSize", amount: 16 },
      ],
    },
    {
      // M7.05: the biggest parties want what only the deep floors give.
      cost: 2000,
      materials: { "iron-ore": 12, "deep-silver": 4, glowcap: 6 },
      days: 9,
      summary: "10 heroes per party, 20 on the roster",
      effects: [
        { type: "partySlots", amount: 10 },
        { type: "rosterSize", amount: 20 },
      ],
    },
  ],
});
