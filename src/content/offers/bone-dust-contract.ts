import { defineOffer } from "../types";

export default defineOffer({
  id: "bone-dust-contract",
  kind: "contract",
  name: "Bone dust for the chapel",
  text: "A chapel in the hills wants bone dust for its rites.",
  weight: 1,
  days: 3,
  minDay: 10,
  wants: { "bone-dust": 4 },
  reward: 110,
  deadline: 12,
});
