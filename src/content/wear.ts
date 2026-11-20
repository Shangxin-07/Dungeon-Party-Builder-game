import { defineWearRules } from "./types";

/**
 * Wear and tear (M6). Nobody can go down the pit every day: fatigue builds up
 * trip after trip and only rest in town takes it away, so a guild needs more
 * heroes than fit in one party. Tune freely.
 */
export default defineWearRules({
  // A one-day floor-1 trip with 2-3 fights costs about 20, so the same party
  // sent down every day is tired within a week. Floor 2 (about 3 days, 5
  // fights) costs about 50, floor 3 about 65.
  fatiguePerTripDay: 8,
  fatiguePerFight: 5,
  restPerDay: 15,
  tiers: [
    {
      at: 35,
      name: "tired",
      passives: [
        { type: "modifyStat", stat: "accuracy", amount: -2 },
        { type: "modifyStat", stat: "evasion", amount: -2 },
        { type: "modifyStat", stat: "initiative", amount: -3 },
      ],
    },
    {
      at: 70,
      name: "exhausted",
      passives: [
        { type: "modifyStat", stat: "accuracy", amount: -5 },
        { type: "modifyStat", stat: "evasion", amount: -5 },
        { type: "modifyStat", stat: "initiative", amount: -6 },
        { type: "modifyStat", stat: "attack", amount: -2 },
        { type: "modifyStat", stat: "spellPower", amount: -2 },
      ],
    },
  ],
  injuryChance: 0.5,
  // Taking a beating (below a third of max HP) without ever going down.
  woundedInjuryChance: 0.3,
  woundedBelow: 0.34,
  injuryPerEnd: 0.03,
});
