import { defineBuilding } from "../types";

/**
 * The Guild Hall sets how many heroes go down together and how many the guild
 * can keep (DESIGN.md §8). More levels are just more rows.
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
      summary: "3 heroes per party, 6 on the roster",
      effects: [
        { type: "partySlots", amount: 3 },
        { type: "rosterSize", amount: 6 },
      ],
    },
    {
      cost: 300,
      days: 3,
      summary: "4 heroes per party, 8 on the roster",
      effects: [
        { type: "partySlots", amount: 4 },
        { type: "rosterSize", amount: 8 },
      ],
    },
    {
      cost: 600,
      materials: { "iron-ore": 6, "spider-silk": 3 },
      days: 5,
      summary: "5 heroes per party, 10 on the roster",
      effects: [
        { type: "partySlots", amount: 5 },
        { type: "rosterSize", amount: 10 },
      ],
    },
    {
      cost: 1000,
      materials: { "iron-ore": 10, "spider-silk": 6 },
      days: 7,
      summary: "6 heroes per party, 12 on the roster",
      effects: [
        { type: "partySlots", amount: 6 },
        { type: "rosterSize", amount: 12 },
      ],
    },
  ],
});
