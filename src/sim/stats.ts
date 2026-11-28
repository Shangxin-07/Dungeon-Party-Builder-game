/**
 * Primary stats -> secondary stats and skills (DESIGN.md §5).
 * Gear, perks and monster traits change the numbers only through
 * PassiveEffects, so new content never needs a new formula here.
 */
import {
  DERIVED,
  STATS,
  type DamageType,
  type Derived,
  type PassiveEffect,
  type SkillDef,
  type Stat,
  type StatBlock,
} from "../content/types";

export type DerivedBlock = Record<Derived, number>;

const isPrimary = (s: string): s is Stat => (STATS as readonly string[]).includes(s);

/** Apply modifyStat effects that target primary stats. Results stay within 1-30. */
export function effectiveStats(base: StatBlock, passives: readonly PassiveEffect[]): StatBlock {
  const out = { ...base } as Record<Stat, number>;
  for (const p of passives) {
    if (p.type === "modifyStat" && isPrimary(p.stat)) out[p.stat] += p.amount;
  }
  for (const s of STATS) out[s] = Math.max(1, Math.min(30, out[s]));
  return out;
}

/** The DESIGN.md §5 formulas, before gear and perks. */
export function baseDerived(s: StatBlock, ranged: boolean, finesse = false): DerivedBlock {
  return {
    maxHp: 10 + s.END * 3 + s.STR,
    mana: s.INT * 2 + s.WIL,
    // Melee hits come from muscle; bows and slings from a steady eye. Finesse
    // weapons (daggers, M9.04) from muscle or quick hands, whichever is better.
    attack: ranged
      ? Math.round((s.DEX + s.PER) / 2)
      : finesse
        ? Math.max(s.STR, s.DEX)
        : s.STR,
    accuracy: s.DEX + Math.floor(s.PER / 2),
    evasion: s.DEX + Math.floor(s.PER / 2),
    initiative: s.DEX + s.PER,
    spellPower: s.INT,
    resist: s.WIL,
    armor: 0,
    carrySlots: 4 + Math.floor((s.STR + s.END) / 5),
  };
}

/**
 * Full secondary stats: formulas, then any fixed overrides (monsters),
 * then modifyStat effects from gear, perks and traits.
 */
export function computeDerived(
  stats: StatBlock,
  passives: readonly PassiveEffect[],
  opts: { ranged?: boolean; finesse?: boolean; overrides?: Partial<DerivedBlock> } = {},
): DerivedBlock {
  const d = { ...baseDerived(stats, opts.ranged ?? false, opts.finesse), ...opts.overrides };
  for (const p of passives) {
    if (p.type === "modifyStat" && !isPrimary(p.stat)) d[p.stat] += p.amount;
  }
  for (const k of DERIVED) d[k] = Math.max(0, d[k]);
  d.maxHp = Math.max(1, d.maxHp);
  return d;
}

/** Skill value 0-100: (a + b) × 2.5 plus modifySkill effects. */
export function skillValue(
  skill: SkillDef,
  stats: StatBlock,
  passives: readonly PassiveEffect[],
): number {
  const [a, b] = skill.basedOn;
  let v = (stats[a] + stats[b]) * 2.5;
  for (const p of passives) if (p.type === "modifySkill" && p.skill === skill.id) v += p.amount;
  return Math.max(0, Math.min(100, Math.round(v)));
}

/** Total percent of a damage type that is resisted (can be negative). Capped at 100. */
export function resistance(passives: readonly PassiveEffect[], type: DamageType): number {
  let r = 0;
  for (const p of passives) if (p.type === "resist" && p.damageType === type) r += p.percent;
  return Math.min(100, r);
}

/** Total bonus damage percent against a target with these tags. */
export function bonusVsTags(passives: readonly PassiveEffect[], tags: readonly string[]): number {
  let b = 0;
  for (const p of passives) if (p.type === "bonusVsTag" && tags.includes(p.tag)) b += p.percent;
  return b;
}
