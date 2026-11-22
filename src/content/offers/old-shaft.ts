import { defineOffer } from "../types";

export default defineOffer({
  id: "old-shaft",
  kind: "petition",
  name: "Reopen the old shaft",
  text: "Some of the old miners want to reopen a side shaft the camp gave up on. Pay for timbering and they'll dig out what's left.",
  weight: 1,
  days: 4,
  minFolk: 2,
  gold: 50,
  materials: { timber: 2 },
  effect: { type: "materials", materials: { "iron-ore": 8 } },
});
