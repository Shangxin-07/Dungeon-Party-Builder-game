import { defineShardSet } from "../types";

// Floor 8's shards (M8.40, DESIGN.md §21): nine more of the Emberstone's,
// grown into the crystal. They open once there are stairs below the
// Glimmering, into the Ember Deeps.
export default defineShardSet({
  id: "glimmering",
  floor: 8,
  item: "shard-glimmering",
  stone: "Emberstone",
  shards: [
    {
      id: "glimmering-drinker",
      kind: "bearer",
      floor: 8,
      hint: "Something walks the Glimmering and the crystal goes dark behind it.",
      monster: "lightdrinker",
      below: 0.5,
      chance: 0.2,
      escort: 0.5,
      // Four heroes of about level 13.
      stand: 52,
      shows:
        "The light goes out of the crystal all at once, and {monster} comes out of the dark, a shard of the Emberstone burning in its throat.",
    },
    {
      id: "glimmering-sleeper",
      kind: "bearer",
      floor: 8,
      hint: "One of the grown-over Keepers isn't where the last party left it.",
      monster: "sleeper-in-glass",
      below: 0.5,
      chance: 0.2,
      escort: 0.6,
      // Four heroes of about level 13.
      stand: 52,
      shows:
        "A Keeper grown over with crystal stands up, glass cracking off it: {monster}, a shard of the Emberstone in its lap where the lamp should be.",
    },
    {
      id: "glimmering-colossus",
      kind: "bearer",
      floor: 9,
      hint: "Down in the Ember Deeps, a heap of slag gets up and walks when the heat rises.",
      monster: "ash-colossus",
      below: 0.5,
      chance: 0.2,
      escort: 0.5,
      // Four heroes of about level 14.
      stand: 56,
      shows:
        "The slag heap stands up into the shape of a man: {monster}, a shard of the Emberstone glowing in its chest.",
    },
    {
      id: "glimmering-cache",
      kind: "cache",
      floor: 8,
      hint: "A shard lies grown into the Glimmering's crystal. A sharp scout might spot it.",
      chance: 0.08,
      hidden: 85,
      spotted:
        "one crystal that's warm to the touch, with a red light deep inside it. Broken open, a shard of the Emberstone",
    },
    {
      id: "glimmering-ash",
      kind: "cache",
      floor: 9,
      hint: "Another lies somewhere in the Ember Deeps, under the ash.",
      chance: 0.08,
      hidden: 85,
      spotted:
        "a patch of ash that never settles, stirred by heat from underneath. Raked over, a shard of the Emberstone",
    },
    {
      id: "glimmering-forge",
      kind: "cache",
      floor: 9,
      hint: "A third lies deeper in the Ember Deeps, near where the Keepers worked.",
      chance: 0.08,
      hidden: 90,
      spotted:
        "something under the bench of a cold forge, wrapped in leather. Unwrapped, a shard of the Emberstone",
    },
    {
      id: "glimmering-stalkers",
      kind: "library",
      floor: 8,
      hint: "The stalkers and hulks keep away from one hall. The Library would have to understand them first.",
      monsters: ["glimmer-stalker", "geode-hulk"],
      points: 220,
      lead: "The Library has it: there's one hall in the Glimmering the stalkers won't hunt in and the hulks won't stand in, because the crystal there is too warm. The next party on floor 8 can dig the shard out.",
      dug: "finds the warm hall the stalkers shun, and cuts a shard of the Emberstone out of its floor",
    },
    {
      id: "glimmering-crawlers",
      kind: "library",
      floor: 9,
      hint: "The slag crawlers are eating towards something. The Library would have to understand them first.",
      monsters: ["slag-crawler", "ash-wraith"],
      points: 230,
      lead: "The Library has it: the crawlers all tunnel towards one spot in the Ember Deeps, and the wraiths gather over it. The next party on floor 9 can dig the shard out.",
      dug: "digs where the crawlers' tunnels meet, and finds a shard of the Emberstone in a nest of slag",
    },
    {
      id: "glimmering-worms",
      kind: "library",
      floor: 9,
      hint: "The ember worms circle something deep in the ash. The Library would have to understand them first.",
      monsters: ["ember-worm", "prism-wisp"],
      points: 240,
      lead: "The Library has it: the ember worms swim in circles round one hollow in the Ember Deeps, the way the wisps drift to a shard above. The next party on floor 9 can dig the shard out.",
      dug: "waits for the worms to pass, and digs a shard of the Emberstone out of the hollow they circle",
    },
  ],
  forge: { materials: { "iron-bands": 8, "deep-silver": 7, glowcap: 6 }, gold: 750, work: 24 },
  surge: {
    power: 2.5,
    text: "The Ember Deeps answer. Heat comes up the stair like an opened oven, and everything that lives in the ash comes with it.",
  },
});
