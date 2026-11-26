import { defineTie } from "../types";

export default defineTie({
  id: "siblings",
  name: "sibling",
  text: "{a} and {b} are family, and watch each other's backs.",
  between: [[], []],
  sameSurname: true,
  chance: 0.7,
  morale: { amount: 3, reason: "went down with family ({other})" },
  passives: [{ type: "modifyStat", stat: "evasion", amount: 2 }],
});
