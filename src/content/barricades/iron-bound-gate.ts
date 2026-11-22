import { defineBarricade } from "../types";

// The proper job (M7.16): a gate of planks strapped with iron from the
// Blacksmith, set into the rock. Takes most of a day, holds about twice as long.
export default defineBarricade({
  id: "iron-bound-gate",
  name: "Iron-bound gate",
  description: "A plank gate strapped with iron and set into the rock. A day's work, and it holds.",
  materials: { planks: 8, "iron-bands": 4 },
  gold: 20,
  strength: 160,
  hours: 10,
});
