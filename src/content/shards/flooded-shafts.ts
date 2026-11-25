import { defineShardSet } from "../types";

// Floor 4's shards (DESIGN.md §20). Deeper floors hide more shards (Mike,
// 2026-11-25): six for floors 4-6, against three for floors 1-3.
export default defineShardSet({
  id: "flooded-shafts",
  floor: 4,
  item: "shard-flooded-shafts",
  shards: [
    {
      id: "flooded-shafts-drowner",
      kind: "bearer",
      floor: 4,
      hint: "Something huge sleeps under the black water of the Shafts. The water there is warm.",
      monster: "old-drowner",
      below: 0.5,
      chance: 0.2,
      escort: 0.5,
      // Four heroes of about level 8.
      stand: 32,
      shows:
        "{monster} heaves up out of the water, a shard of the Hearthstone glowing in its gullet.",
    },
    {
      id: "flooded-shafts-saint",
      kind: "bearer",
      floor: 4,
      hint: "The ghouls in the Shafts kneel to something. It wears a relic that glows.",
      monster: "hollow-saint",
      below: 0.5,
      chance: 0.2,
      escort: 0.5,
      // Four heroes of about level 8.
      stand: 32,
      shows:
        "{monster} comes through its kneeling pack, a shard of the Hearthstone hung round its neck.",
    },
    {
      id: "flooded-shafts-cache",
      kind: "cache",
      floor: 4,
      hint: "A shard lies hidden somewhere in the Flooded Shafts. A sharp scout might spot it.",
      chance: 0.08,
      hidden: 65,
      spotted: "a patch of water that never freezes. Under the silt, a shard of the Hearthstone",
    },
    {
      id: "flooded-shafts-deep-cache",
      kind: "cache",
      floor: 5,
      hint: "Another of the Shafts' shards sank further, into the Old Delve.",
      chance: 0.08,
      hidden: 70,
      spotted:
        "glowcap growing thick round one fallen beam, far too thick. Under it, a shard of the Hearthstone",
    },
    {
      id: "flooded-shafts-library",
      kind: "library",
      floor: 4,
      hint: "The Library could find one, once it knows the ghouls of the Shafts well.",
      monsters: ["ghoul", "ghast"],
      points: 100,
      lead: "The Library has it: ghouls gather to feed where the water's warm, and their tracks lead to one flooded gallery in the Shafts. The next party on floor 4 can dig the shard out.",
      dug: "wades into the warm gallery the Library marked and comes up with a shard of the Hearthstone",
    },
    {
      id: "flooded-shafts-tally",
      kind: "library",
      floor: 5,
      hint: "The Foreman's Shade knows where one fell. The Library would have to understand him first.",
      monsters: ["lost-delver", "foremans-shade"],
      points: 120,
      lead: "The Library has it: the foreman's tally marks a 'warm stone, set aside' in a side gallery of the Old Delve. The next party on floor 5 can dig the shard out.",
      dug: "finds the side gallery from the foreman's tally, and the warm stone set aside there: a shard of the Hearthstone",
    },
  ],
});
