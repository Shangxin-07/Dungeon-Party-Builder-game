import { defineShardSet } from "../types";

// Floor 6's shards (M8.38, DESIGN.md §21): six, the Coalstone's, like floor 5's.
// They open once there are stairs below the Keepers' Stair: the Coal Halls.
export default defineShardSet({
  id: "keepers-stair",
  floor: 6,
  item: "shard-keepers-stair",
  stone: "Coalstone",
  shards: [
    {
      id: "keepers-stair-mother",
      kind: "bearer",
      floor: 6,
      hint: "The cinder hounds on the stair all come from somewhere. Something big dens below the lamps.",
      monster: "cinder-mother",
      below: 0.5,
      chance: 0.2,
      escort: 0.5,
      // Four heroes of about level 11.
      stand: 44,
      shows:
        "{monster} comes up the stair at a run, a shard of the Coalstone burning through the hide of her chest.",
    },
    {
      id: "keepers-stair-bellows",
      kind: "bearer",
      floor: 7,
      hint: "In the Coal Halls the great bellows still breathe, and whatever works them glows in the chest.",
      monster: "old-bellows",
      below: 0.5,
      chance: 0.2,
      escort: 0.5,
      // Four heroes of about level 12.
      stand: 48,
      shows:
        "{monster} lets go of the bellows and turns, a shard of the Coalstone set in its chest like a coal.",
    },
    {
      id: "keepers-stair-cache",
      kind: "cache",
      floor: 6,
      hint: "A shard lies hidden somewhere on the Keepers' Stair. A sharp scout might spot it.",
      chance: 0.08,
      hidden: 75,
      spotted:
        "one lamp on the stair that burns with nothing in it. Behind it, a shard of the Coalstone",
    },
    {
      id: "keepers-stair-coal",
      kind: "cache",
      floor: 7,
      hint: "Another shard fell into the coal heaps of the halls below.",
      chance: 0.08,
      hidden: 80,
      spotted: "one lump in a coal heap that glows a different red. A shard of the Coalstone",
    },
    {
      id: "keepers-stair-hounds",
      kind: "library",
      floor: 6,
      hint: "The Library could find one, once it knows the cinder hounds well.",
      monsters: ["cinder-hound", "keepers-echo"],
      points: 160,
      lead: "The Library has it: cinder hounds sleep curled round anything hot, and they all go back to one landing on the stair. The next party on floor 6 can dig the shard out.",
      dug: "drives the hounds off the landing the Library marked and lifts a shard of the Coalstone out of their bedding",
    },
    {
      id: "keepers-stair-ledger",
      kind: "library",
      floor: 7,
      hint: "The lamplighters keep a round. The Library would have to understand them first.",
      monsters: ["lamplighter", "stoker"],
      points: 180,
      lead: "The Library has it: the lamplighters' round skips one lamp in the Coal Halls, every time, as if it's already lit. The next party on floor 7 can dig the shard out.",
      dug: "finds the lamp the lamplighters skip, and a shard of the Coalstone burning in it",
    },
  ],
  forge: { materials: { "iron-bands": 6, "deep-silver": 5, glowcap: 4 }, gold: 500, work: 18 },
  surge: {
    power: 2.5,
    text: "The Coal Halls answer. The great bellows breathe in, and everything in the halls comes up the stair on the heat.",
  },
});
