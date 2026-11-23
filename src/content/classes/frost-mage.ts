import { defineClass } from "../types";

// An advanced class (DESIGN.md §9): a Mage who goes deep into cold magic.
// Opens at Mage 10 with high INT, and needs a Library to study in.
export default defineClass({
  id: "frost-mage",
  name: "Frost Mage",
  icon: { sheet: "classes", cell: 3 },
  hats: [5],
  kind: "advanced",
  blurb: "Back row. Freezes whole rooms solid.",
  requires: { classLevels: { mage: 10 }, stats: { INT: 16 }, building: "library" },
  mainStats: ["INT", "WIL"],
  likes: ["staff", "cold"],
  row: "back",
  ai: "caster",
  abilities: { "frost-lance": 1, blizzard: 1 },
  startingKit: ["staff", "healing-potion"],
  growth: { INT: 1, WIL: 1 },
  perLevel: [
    { type: "modifyStat", stat: "spellPower", amount: 0.5 },
    { type: "modifyStat", stat: "mana", amount: 1 },
  ],
  milestones: { 5: ["winters-heart"] },
});
