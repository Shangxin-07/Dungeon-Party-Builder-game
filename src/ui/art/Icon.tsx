/**
 * Small icons next to names (M8, DESIGN.md §19.4). Content names a cell of an
 * icon sheet (`icon` on classes, items and monsters); the sheets are Mike's
 * pixel art, cut with `scripts/cut-sprite.py --grid` and registered below.
 * Until a sheet arrives, or for anything without an icon, the name's first
 * letter sits in a circle instead.
 */
import { ICON_SHEETS, type IconRef, type IconSheet } from "../../content/types";
import type { Hero } from "../../sim/hero";
import { mainClass } from "../../sim/levels";
import { ix } from "../game";
import armour from "./icons/armour.png";
import classes from "./icons/classes.png";
import monsters1 from "./icons/monsters-1.png";
import monsters2 from "./icons/monsters-2.png";
import supplies from "./icons/supplies.png";
import weapons from "./icons/weapons.png";

/** Cut icon sheets: a PNG of square cells, `cell` pixels each, in the grid ICON_SHEETS gives. */
export const ICON_ART: Partial<Record<IconSheet, { url: string; cell: number }>> = {
  classes: { url: classes, cell: 64 },
  "monsters-1": { url: monsters1, cell: 64 },
  "monsters-2": { url: monsters2, cell: 64 },
  weapons: { url: weapons, cell: 64 },
  armour: { url: armour, cell: 64 },
  supplies: { url: supplies, cell: 64 },
};

/** Icons for people who have no class of their own (cells of the classes sheet). */
export const PEOPLE = {
  porter: { sheet: "classes", cell: 9 },
  townsfolk: { sheet: "classes", cell: 10 },
  recruit: { sheet: "classes", cell: 11 },
} as const satisfies Record<string, IconRef>;

/** Spare cells for things with no content of their own. */
export const SPARE = {
  /** A risen guild mate fighting for the dungeon. */
  risen: { sheet: "monsters-2", cell: 6 },
  /** Anything in a fight we can't name. */
  unknown: { sheet: "monsters-2", cell: 7 },
  /** A haul of loot. */
  loot: { sheet: "supplies", cell: 11 },
} as const satisfies Record<string, IconRef>;

/** A foe's icon: its monster, a risen guild mate, or the unknown shape. */
export function monsterIconRef(
  id: string | undefined,
  name: string,
): { icon: IconRef; name: string } {
  const m = id ? ix.lib.monsters.find((x) => x.id === id) : undefined;
  if (m?.icon) return { icon: m.icon, name: m.name };
  if (/, Risen$/.test(name)) return { icon: SPARE.risen, name };
  return { icon: SPARE.unknown, name: m?.name ?? name };
}

function initial(name: string): string {
  return (
    name
      .replace(/^the\s+/i, "")
      .charAt(0)
      .toUpperCase() || "?"
  );
}

export function Icon({
  icon,
  name,
  size = 20,
  className = "",
}: {
  icon?: IconRef;
  /** What it is: the fallback letter, and the tooltip. */
  name: string;
  size?: number;
  className?: string;
}) {
  const art = icon && ICON_ART[icon.sheet];
  if (!icon || !art)
    return (
      <span
        className={`icon icon-letter ${className}`}
        style={{ width: size, height: size, fontSize: Math.round(size * 0.55) }}
        title={name}
        aria-hidden="true"
      >
        {initial(name)}
      </span>
    );
  const grid = ICON_SHEETS[icon.sheet];
  const col = icon.cell % grid.cols;
  const row = Math.floor(icon.cell / grid.cols);
  return (
    <span
      className={`icon ${className}`}
      style={{
        width: size,
        height: size,
        backgroundImage: `url(${art.url})`,
        backgroundSize: `${grid.cols * size}px ${grid.rows * size}px`,
        backgroundPosition: `-${col * size}px -${row * size}px`,
      }}
      title={name}
      aria-hidden="true"
    />
  );
}

/** A hero's icon: their main class, or a porter's pack, or a plain recruit. */
export function HeroIcon({ hero, size }: { hero: Hero; size?: number }) {
  const { icon, name } = heroIconRef(hero);
  return <Icon icon={icon} name={name} size={size} />;
}

export function MonsterIcon({ id, name, size }: { id?: string; name: string; size?: number }) {
  const ref = monsterIconRef(id, name);
  return <Icon icon={ref.icon} name={ref.name} size={size} />;
}

/** An item's icon. A specimen with no art of its own borrows its monster's. */
export function ItemIcon({ id, size }: { id: string; size?: number }) {
  const item = ix.lib.items.find((x) => x.id === id);
  const from = item?.research?.monsters?.[0];
  const icon = item?.icon ?? (from ? ix.lib.monsters.find((m) => m.id === from)?.icon : undefined);
  return <Icon icon={icon} name={item?.name ?? id} size={size} />;
}

/** The same icon inside an SVG (the fight tokens): the cell, or the initial. */
export function SvgIcon({
  icon,
  name,
  x,
  y,
  size,
}: {
  icon?: IconRef;
  name: string;
  /** Centre. */
  x: number;
  y: number;
  size: number;
}) {
  const art = icon && ICON_ART[icon.sheet];
  if (!icon || !art)
    return (
      <text
        x={x}
        y={y + size * 0.2}
        textAnchor="middle"
        className="token-letter"
        fontSize={size * 0.6}
      >
        {initial(name)}
      </text>
    );
  const grid = ICON_SHEETS[icon.sheet];
  const col = icon.cell % grid.cols;
  const row = Math.floor(icon.cell / grid.cols);
  return (
    <svg
      x={x - size / 2}
      y={y - size / 2}
      width={size}
      height={size}
      viewBox={`${col * art.cell} ${row * art.cell} ${art.cell} ${art.cell}`}
      overflow="hidden"
    >
      <image href={art.url} width={grid.cols * art.cell} height={grid.rows * art.cell} />
    </svg>
  );
}

/** A hero's icon reference: their main class, a porter's pack, or a plain recruit. */
export function heroIconRef(hero: Hero): { icon?: IconRef; name: string } {
  if (hero.porter) return { icon: PEOPLE.porter, name: "Porter" };
  const id = mainClass(hero);
  const cls = id ? ix.lib.classes.find((c) => c.id === id) : undefined;
  return cls ? { icon: cls.icon, name: cls.name } : { icon: PEOPLE.recruit, name: "Untrained" };
}
