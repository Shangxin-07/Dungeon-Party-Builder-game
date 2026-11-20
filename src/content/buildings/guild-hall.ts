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
  levels: [
    {
      cost: 0,
      summary: "3 heroes per party, 6 on the roster",
      effects: [
        { type: "partySlots", amount: 3 },
        { type: "rosterSize", amount: 6 },
      ],
    },
    {
      cost: 300,
      summary: "4 heroes per party, 8 on the roster",
      effects: [
        { type: "partySlots", amount: 4 },
        { type: "rosterSize", amount: 8 },
      ],
    },
  ],
});
