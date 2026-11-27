import { defineCoreRules } from "../types";

/**
 * The Emberstone's heart (M8.41, DESIGN.md §21): the bottom of the pit and
 * the end of Act Two. Every floor above the Kiln held, a party walks it,
 * follows the Keepers' last tracks to the heart, and fights the Tender. Still,
 * the guild chooses (Mike, 2026-11-26): mend the stone (the morale road:
 * every floor is made safe) or bind it (the profit road: the stone works for
 * the guild, and the deep never quite sleeps).
 */
export default defineCoreRules({
  id: "emberstone",
  stone: "Emberstone",
  floor: 10,
  guardian: "the-tender",
  guide: "the Keepers' last tracks",
  // Floor 9 sealed: the slate at the Kiln's door says where it is.
  revealedBy: "ember-deeps-sealed",
  escort: 0.5,
  walkHours: 2,
  shutHours: 8,
  text: {
    reach:
      "The Keepers' tracks are still there in the soot, going in and never coming out. They lead round the Kiln's curve to its middle, where the heat is white. There, on a stone floor fired to glass, the Emberstone lies in two halves, and something is holding them together.",
    guardian:
      "The shape in the fire turns from the stone, still holding it with one hand, and the Kiln's own things come in from every side. There's nowhere to go but through it.",
    shut: "The Tender sinks back into the stone it tended. The two halves lie still, side by side, and for the first time in longer than there have been people, the Emberstone is quiet. Whatever happens to it now is the guild's to decide.",
    beaten:
      "The party can't get past what stands in the fire. It doesn't follow them: it only turns back to the stone, and goes on holding it.",
    panel:
      "The Emberstone lies in the Kiln, broken in two, the oldest of the stones. Every shard that blew up through the pit, and everything that ever bred down there, came from it in the end.",
  },
  ways: [
    {
      id: "mended",
      name: "Mend it",
      workshop: "temple",
      gold: 2000,
      materials: { glowcap: 12, "deep-silver": 10, "spider-silk": 10 },
      blurb:
        "The priests go down with everything the guild has learned (the Foreman's pages, the Keepers' slates, the stilled hearts) and make the Emberstone whole. It sleeps, the way the Keepers meant: every floor is made safe, and nothing breeds again. Good heroes will be glad of it.",
      news: "The Emberstone is whole. The priests came back up the pit singing, and behind them, floor by floor, everything down there lay down and went still. The pit is quiet, all the way to the bottom.",
      safe: true,
      blessing: {
        name: "The deep sleeps",
        text: "Heroes rest easier (2 morale every day in town), injuries mend a day faster each day, and the dead lie still a month before they'd rise.",
        effects: [
          { type: "restMorale", amount: 2 },
          { type: "healing", amount: 1 },
          { type: "riseDelay", amount: 30 },
        ],
      },
      fact: "heartMended",
      ending: {
        title: "The Emberstone is whole",
        text: "The guild went down to the bottom of the pit and mended the oldest stone of all. It sleeps whole now, and the stones above it sleep with it. Every floor is safe. Nothing will come up those stairs again.",
      },
    },
    {
      id: "bound",
      name: "Bind it",
      workshop: "black-market",
      gold: 2000,
      materials: { "iron-bands": 14, "deep-silver": 10, "bone-dust": 10 },
      blurb:
        "The Black Market's people go down with iron and deep silver and bind the two halves together still burning, its fire turned to the guild's use. Hauls sell for more, heroes learn faster and the town is feared; but the Kiln never quite sleeps, and Good heroes will never like it.",
      news: "The Emberstone is bound. The Black Market's crew came back up with their hands burned and their purses full, and the whole town feels warmer. Down in the Kiln something still stirs, now and then.",
      breeds: 2,
      blessing: {
        name: "The stone works",
        text: "Hauls sell for 10 points more, every trip gives a quarter more XP, and the town is feared (6 defence). The Kiln still breeds a little, and Good heroes lose a little morale every day.",
        effects: [
          { type: "fence", amount: 10 },
          { type: "xpPercent", amount: 25 },
          { type: "defence", amount: 6 },
        ],
      },
      fact: "heartBound",
      ending: {
        title: "The Emberstone is bound",
        text: "The guild went down to the bottom of the pit and put the oldest stone of all to work. It burns for the guild now: richer hauls, stronger heroes, a town nothing dares raid. The Kiln never sleeps, and never will.",
      },
    },
  ],
});
