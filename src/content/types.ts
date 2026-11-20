/**
 * Content definition types. Game content (classes, monsters, items, ...) is
 * plain data checked against these types. The engine reads definitions by id
 * and never special-cases a particular class or monster. See docs/DESIGN.md §11.
 */

export const STATS = ["STR", "DEX", "END", "PER", "INT", "WIL", "CHA"] as const;
export type Stat = (typeof STATS)[number];

export interface ClassDef {
  /** Unique kebab-case id, referenced from other content. */
  id: string;
  name: string;
  /** One-line description shown in town. */
  blurb: string;
  /** The stats this class grows fastest in. */
  mainStats: readonly Stat[];
  /** Tags of gear this class likes using (affects morale later). */
  likes: readonly string[];
}

/** Identity helper so definitions get full type checking and editor hints. */
export const defineClass = (def: ClassDef): ClassDef => def;
