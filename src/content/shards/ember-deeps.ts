import { defineShardSet } from "../types";

// Floor 9's shards (M8.41, DESIGN.md §21): the Emberstone's last nine, in the
// ash of the Ember Deeps and at the Kiln's door. They open once there are
// stairs below the Ember Deeps, into the Kiln.
export default defineShardSet({
  id: "ember-deeps",
  floor: 9,
  item: "shard-ember-deeps",
  stone: "Emberstone",
  shards: [
    {
      id: "ember-deeps-worm",
      kind: "bearer",
      floor: 9,
      hint: "The ash in the Ember Deeps heaves like a sea sometimes, all at once, for a long way.",
      monster: "old-worm",
      below: 0.5,
      chance: 0.2,
      escort: 0.5,
      // Four heroes of about level 14.
      stand: 56,
      shows:
        "The whole floor of ash rises: {monster}, as long as a gallery, a shard of the Emberstone glowing in its throat.",
    },
    {
      id: "ember-deeps-choir",
      kind: "bearer",
      floor: 9,
      hint: "Somewhere in the Ember Deeps the ash sings, low and dry, and the wraiths go to it.",
      monster: "ash-choir",
      below: 0.5,
      chance: 0.2,
      escort: 0.6,
      // Four heroes of about level 14.
      stand: 56,
      shows:
        "The falling ash draws together into a hundred faces, singing: {monster}, a shard of the Emberstone at its heart.",
    },
    {
      id: "ember-deeps-king",
      kind: "bearer",
      floor: 10,
      hint: "Something holds up the Kiln's door, and it doesn't like to be passed.",
      monster: "clinker-king",
      below: 0.5,
      chance: 0.2,
      escort: 0.5,
      // Four heroes of about level 15.
      stand: 60,
      shows:
        "The Kiln's door-post steps out of the wall: {monster}, a shard of the Emberstone burning in its chest.",
    },
    {
      id: "ember-deeps-cache",
      kind: "cache",
      floor: 9,
      hint: "A shard lies under the ash of the Ember Deeps. A sharp scout might spot it.",
      chance: 0.08,
      hidden: 85,
      spotted:
        "a hollow in the ash that stays clear however much falls. At the bottom, a shard of the Emberstone",
    },
    {
      id: "ember-deeps-shelf",
      kind: "cache",
      floor: 10,
      hint: "Another is in the Kiln, put somewhere safe by whoever found it first.",
      chance: 0.08,
      hidden: 90,
      spotted:
        "a fired pot on a high shelf that's hotter than the rest. Inside, wrapped in ash, a shard of the Emberstone",
    },
    {
      id: "ember-deeps-door",
      kind: "cache",
      floor: 10,
      hint: "A third lies near the heart of the Kiln, where the heat is worst.",
      chance: 0.08,
      hidden: 90,
      spotted:
        "a brick in the kiln wall that's been taken out and put back. Behind it, a shard of the Emberstone",
    },
    {
      id: "ember-deeps-worms",
      kind: "library",
      floor: 9,
      hint: "The ember worms and slag crawlers both shun one stretch of the Deeps. The Library would have to understand them first.",
      monsters: ["ember-worm", "slag-crawler"],
      points: 250,
      lead: "The Library has it: there's one stretch of the Ember Deeps no worm swims and no crawler digs, because the ash there is too hot even for them. The next party on floor 9 can dig the shard out.",
      dug: "finds the stretch the worms shun and rakes a shard of the Emberstone out of the hottest ash",
    },
    {
      id: "ember-deeps-golems",
      kind: "library",
      floor: 10,
      hint: "The clinker golems are holding something up besides the walls. The Library would have to understand them first.",
      monsters: ["clinker-golem", "flame-dancer"],
      points: 260,
      lead: "The Library has it: the golems are all leaning on one pillar in the Kiln, the way builders shore up a crack, and the flames dance round its foot. The next party on floor 10 can dig the shard out.",
      dug: "knocks the last brick out of the pillar the golems lean on, and a shard of the Emberstone falls out",
    },
    {
      id: "ember-deeps-drakes",
      kind: "library",
      floor: 10,
      hint: "The kiln drakes bask in one place above all. The Library would have to understand them first.",
      monsters: ["kiln-drake", "ash-wraith"],
      points: 270,
      lead: "The Library has it: the drakes all bask on one hearthstone in the Kiln, and it's warm from underneath. The next party on floor 10 can dig the shard out.",
      dug: "lifts the hearthstone the drakes bask on, and a shard of the Emberstone lies under it",
    },
  ],
  forge: { materials: { "iron-bands": 9, "deep-silver": 8, glowcap: 7 }, gold: 850, work: 26 },
  surge: {
    power: 2.5,
    text: "The Kiln answers. The heat comes up the stair like a forge's breath, and everything fired in it comes too.",
  },
});
