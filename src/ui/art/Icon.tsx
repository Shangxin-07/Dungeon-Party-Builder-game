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

/** Cut icon sheets: a PNG of square cells, `cell` pixels each, in the grid ICON_SHEETS gives. */
export const ICON_ART: Partial<Record<IconSheet, { url: string; cell: number }>> = {};

/** Icons for people who have no class of their own (cells of the classes sheet). */
export const PEOPLE = {
  porter: { sheet: "classes", cell: 9 },
  townsfolk: { sheet: "classes", cell: 10 },
  recruit: { sheet: "classes", cell: 11 },
} as const satisfies Record<string, IconRef>;

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
  if (hero.porter) return <Icon icon={PEOPLE.porter} name="Porter" size={size} />;
  const id = mainClass(hero);
  const cls = id ? ix.lib.classes.find((c) => c.id === id) : undefined;
  if (!cls) return <Icon icon={PEOPLE.recruit} name="Untrained" size={size} />;
  return <Icon icon={cls.icon} name={cls.name} size={size} />;
}

export function MonsterIcon({ id, name, size }: { id?: string; name: string; size?: number }) {
  const m = id ? ix.lib.monsters.find((x) => x.id === id) : undefined;
  return <Icon icon={m?.icon} name={m?.name ?? name} size={size} />;
}

export function ItemIcon({ id, size }: { id: string; size?: number }) {
  const item = ix.lib.items.find((x) => x.id === id);
  return <Icon icon={item?.icon} name={item?.name ?? id} size={size} />;
}
