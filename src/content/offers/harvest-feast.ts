import { defineOffer } from "../types";

export default defineOffer({
  id: "harvest-feast",
  kind: "petition",
  name: "A feast",
  text: "The townsfolk want a feast for the guild that keeps them safe. It costs gold, and everyone at home would enjoy it.",
  weight: 1,
  days: 3,
  minFolk: 3,
  gold: 40,
  effect: { type: "morale", amount: 6 },
});
