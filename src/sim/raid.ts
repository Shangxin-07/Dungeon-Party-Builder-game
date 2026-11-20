/**
 * Raids (DESIGN.md §4, §8). Whatever climbs out of the pit at night meets the
 * town's defences first. The walls hold back `defence` strength; anything left
 * over is a raid. Healthy heroes at home fight the raiders with the normal
 * combat sim. If nobody can stop them, the raiders steal gold and damage
 * buildings (never destroy them).
 *
 * The fight is written in the same log format as an expedition, so the town
 * can play it back on the watch screen.
 */
import { foeSheet, runCombat } from "./combat";
import { rollEncounter } from "./encounter";
import type { ExpeditionEvent, HeroStatus } from "./expedition";
import { heroSheet, type Hero } from "./hero";
import type { Index } from "./library";
import type { Rng } from "./rng";

export type RaidOutcome =
  /** The walls held: nothing got through. */
  | "held"
  /** Heroes at home beat the raiders. */
  | "repelled"
  /** Heroes at home lost. */
  | "overrun"
  /** Nobody fit to fight was home. */
  | "unopposed";

export interface RaidReport {
  day: number;
  /** Monsters that climbed out, their level and total strength. */
  climbed: number;
  level: number;
  strength: number;
  defence: number;
  /** Strength that got past the defences. */
  leftover: number;
  outcome: RaidOutcome;
  /** Monster ids that reached the town. */
  raiders: string[];
  /** The defenders as they were when the raid started. */
  defenders: Hero[];
  /** Defenders after the fight. */
  after: Hero[];
  kills: number;
  /** Kills per defender id. */
  heroKills: Record<string, number>;
  goldStolen: number;
  /** Building ids damaged. */
  damaged: string[];
  /** Watchable fight. Empty if there was no fight. */
  log: ExpeditionEvent[];
}

export interface RaidInput {
  day: number;
  climbed: number;
  level: number;
  strength: number;
  defence: number;
  /** Heroes at home, healthy or not. The fit ones fight. */
  home: readonly Hero[];
  gold: number;
  /** Building ids that raiders could damage (built, not raid-proof, not already damaged). */
  targets: readonly string[];
}

/** Heroes fit to fight off a raid, strongest first. */
export function fitDefenders(ix: Index, home: readonly Hero[]): Hero[] {
  const rules = ix.lib.dungeon.raids;
  return home
    .filter((h) => {
      const max = heroSheet(ix, h).derived.maxHp;
      return h.condition === "ok" && h.hp >= (max * rules.defenderMinHpPercent) / 100;
    })
    .sort((a, b) => heroSheet(ix, b).derived.maxHp - heroSheet(ix, a).derived.maxHp)
    .slice(0, rules.maxDefenders);
}

export function resolveRaid(ix: Index, input: RaidInput, rng: Rng): RaidReport {
  const rules = ix.lib.dungeon.raids;
  const leftover = Math.max(0, input.strength - input.defence);
  const report: RaidReport = {
    day: input.day,
    climbed: input.climbed,
    level: input.level,
    strength: input.strength,
    defence: input.defence,
    leftover,
    outcome: "held",
    raiders: [],
    defenders: [],
    after: [],
    kills: 0,
    heroKills: {},
    goldStolen: 0,
    damaged: [],
    log: [],
  };
  if (leftover <= 0) return report;

  report.raiders = rollEncounter(ix, 1, rng, {
    level: input.level,
    power: leftover * rules.powerPerStrength,
  });
  const defenders = fitDefenders(ix, input.home);
  report.defenders = structuredClone(defenders);

  let won = false;
  if (defenders.length) {
    const fight = runCombat(ix, defenders, report.raiders, {
      seed: rng.int(0, 2 ** 31 - 1),
      noBleeding: true,
    });
    report.after = fight.party;
    report.kills = fight.kills.length;
    for (const e of fight.log) {
      if (e.kind === "killed" && e.actor && defenders.some((h) => h.id === e.actor))
        report.heroKills[e.actor] = (report.heroKills[e.actor] ?? 0) + 1;
    }
    won = fight.winner !== "monsters";
    report.outcome = won ? "repelled" : "overrun";
    report.log = raidLog(ix, report, fight);
  } else {
    report.outcome = "unopposed";
  }

  if (!won) {
    report.goldStolen = Math.min(input.gold, leftover * rules.goldPerStrength);
    const pool = [...input.targets];
    const hits = Math.min(pool.length, Math.floor(leftover / rules.strengthPerDamage));
    for (let i = 0; i < hits; i++) {
      report.damaged.push(pool.splice(rng.int(0, pool.length - 1), 1)[0]!);
    }
  }
  return report;
}

/** Turn the raid fight into the watchable log format. */
function raidLog(
  ix: Index,
  report: RaidReport,
  fight: ReturnType<typeof runCombat>,
): ExpeditionEvent[] {
  const snapshot = (heroes: readonly Hero[]): HeroStatus[] =>
    heroes.map((h) => {
      const d = heroSheet(ix, h).derived;
      return {
        uid: h.id,
        name: h.name,
        hp: h.hp,
        maxHp: d.maxHp,
        mana: h.mana,
        maxMana: d.mana,
        condition: h.condition,
      };
    });
  const names = (xs: readonly string[]) =>
    xs.length > 1 ? `${xs.slice(0, -1).join(", ")} and ${xs.at(-1)}` : (xs[0] ?? "");
  const log: ExpeditionEvent[] = [];
  const at = { floor: 0, room: 0 };
  log.push({
    kind: "raid",
    text:
      `Night of day ${report.day}: ${report.climbed} monsters climb out of the pit ` +
      `(strength ${report.strength}). The defences hold back ${report.defence}; ` +
      `the rest come for the town.`,
    ...at,
    party: snapshot(report.defenders),
  });
  const foes = fight.fighters.filter((f) => f.side === "monsters").slice(0, report.raiders.length);
  log.push({
    kind: "fight",
    text: `${names(report.defenders.map((h) => h.name))} face ${names(foes.map((f) => f.name))}.`,
    ...at,
    party: snapshot(report.defenders),
    monsters: foes.map(foeSheet),
  });
  for (const e of fight.log) {
    if (e.kind !== "start") log.push({ kind: "combat", text: e.text, ...at, combat: e });
  }
  const ending =
    fight.winner === "monsters"
      ? "The defenders fall. The raiders run loose through the town."
      : "The raiders are beaten back into the pit.";
  log.push({ kind: "raid", text: ending, ...at, party: snapshot(fight.party) });
  return log;
}
