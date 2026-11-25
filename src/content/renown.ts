import { defineRenownRules } from "./types";

/**
 * Renown (M8.19, DESIGN.md §20): the guild's name in the valley. Sealing a
 * floor is the big step; shards, lairs and the town's own business add a
 * little. Each rank works like a building: its effects add to the town's,
 * on top of the ranks below it.
 *
 * Roughly: floor 1 sealed (3 shards and the stone) is 16, Known; floors 1-2
 * is 32, Talked of; floors 1-3 is 48, Famous; floor 4 as well is about 70.
 */
export default defineRenownRules({
  deeds: { shard: 2, stone: 10, lair: 3, contract: 1, petition: 1, breach: -3, core: 30 },
  ranks: [
    {
      at: 0,
      name: "Unknown",
      summary: "Nobody past the valley has heard of the guild.",
      effects: [],
    },
    {
      at: 10,
      name: "Known in the valley",
      summary: "Better recruits: each is the best of one more.",
      effects: [{ type: "recruitPicks", amount: 1 }],
    },
    {
      at: 25,
      name: "Talked of in the towns",
      summary: "One more recruit a day, settlers come more often, offers turn up more often.",
      effects: [
        { type: "recruitOffers", amount: 1 },
        { type: "settlerChance", amount: 20 },
        { type: "offerChance", amount: 10 },
      ],
    },
    {
      at: 45,
      name: "Famous",
      summary:
        "One recruit a day comes trained, contracts pay 20% more, and the Guild Hall can be built to its last level.",
      effects: [
        { type: "trainedRecruits", amount: 1 },
        { type: "contractPay", amount: 20 },
      ],
    },
    {
      at: 70,
      name: "A legend",
      summary: "The best recruits in the land: each is the best of one more again.",
      effects: [{ type: "recruitPicks", amount: 1 }],
    },
  ],
});
