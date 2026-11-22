import { defineOffer } from "../types";

export default defineOffer({
  id: "planks-contract",
  kind: "contract",
  name: "Planks for a barn",
  text: "A farmer up the road is building a barn and wants planks.",
  weight: 1,
  days: 3,
  needs: "sawmill",
  wants: { planks: 10 },
  reward: 70,
  deadline: 8,
});
