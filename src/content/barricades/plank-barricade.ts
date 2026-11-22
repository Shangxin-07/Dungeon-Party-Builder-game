import { defineBarricade } from "../types";

// The quick one (M7.16): planks nailed across the stairhead. Holds a week or
// so against a full floor below, longer against a quiet one.
export default defineBarricade({
  id: "plank-barricade",
  name: "Plank barricade",
  description:
    "Planks nailed across the top of the stairs. Quick to put up; it won't hold for long.",
  materials: { planks: 6 },
  strength: 60,
  hours: 4,
});
