import { definePerk } from "../types";

// CHA is the party's morale shield on a trip (content/morale.ts leaderPerCha).
export default definePerk({
  id: "rallying-voice",
  name: "Rallying Voice",
  description: "+2 CHA: the party takes bad news on a trip better.",
  classes: ["cleric"],
  passives: [{ type: "modifyStat", stat: "CHA", amount: 2 }],
});
