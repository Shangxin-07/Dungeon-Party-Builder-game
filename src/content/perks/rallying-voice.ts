import { definePerk } from "../types";

// CHA is the party's morale shield on a trip (content/morale.ts leaderPerCha).
export default definePerk({
  id: "rallying-voice",
  name: "Rallying Voice",
  description: "+2 CHA and +10 Leadership: the party takes bad news better, and follows further.",
  classes: ["cleric"],
  passives: [
    { type: "modifyStat", stat: "CHA", amount: 2 },
    { type: "modifySkill", skill: "leadership", amount: 10 },
  ],
});
