/**
 * A fight as tokens (M8.05, DESIGN.md §19.3): each side in its front and back
 * rows, one token per combatant with health (and mana) bars, a mark for the
 * downed and the dead, and the latest blow drawn from attacker to target. A
 * picture over the log, never instead of it: the lines below stay as they are.
 */
import type { IconRef } from "../content/types";
import type { CombatEvent } from "../sim/combat";
import type { Hero } from "../sim/hero";
import { heroIconRef, monsterIconRef, SvgIcon } from "./art/Icon";
import { Portrait } from "./art/Portrait";
import type { Bar } from "./Watch";

const R = 19;
const GAP = 64;
const TOP = 40;
/**
 * Big fights (M8.12): a row never stacks more than this many tokens. More of
 * them wrap into extra columns, each one half a step lower than the last, so
 * names never sit side by side and the picture stays short however many fight.
 */
const PER_COLUMN = 3;
/** Between columns of one row, between a side's two rows, and from the middle line. */
const COLUMN_STEP = 58;
const ROW_STEP = 108;
const FROM_MIDDLE = 90;
const EDGE = 62;

interface Token {
  bar: Bar;
  icon?: IconRef;
  /** What the icon shows: a class or a monster (its initial until the art comes). */
  iconName: string;
  /** A hero's face, drawn in the disc instead of the class icon. */
  hero?: Hero;
  label: string;
  x: number;
  y: number;
  foe: boolean;
}

type Unplaced = Omit<Token, "x" | "y">;
type Row = "front" | "back";

/** How many columns each of a side's rows needs (at least one, to keep its label). */
function columnsOf(list: readonly Unplaced[], rowOf: (t: Unplaced) => Row) {
  const count = (row: Row) => list.filter((t) => rowOf(t) === row).length;
  return {
    front: Math.max(1, Math.ceil(count("front") / PER_COLUMN)),
    back: Math.max(1, Math.ceil(count("back") / PER_COLUMN)),
  };
}

/** How far a side reaches from the middle line, edge margin included. */
function reach(cols: { front: number; back: number }) {
  return (
    FROM_MIDDLE + (cols.front - 1) * COLUMN_STEP + ROW_STEP + (cols.back - 1) * COLUMN_STEP + EDGE
  );
}

/**
 * Where each token sits. Columns run outward from the middle line: the front
 * row's first (nearest the enemy), then the back row's. Every other column is
 * dropped half a step, like a honeycomb.
 */
function place(
  list: readonly Unplaced[],
  side: "party" | "foes",
  middle: number,
  rowOf: (t: Unplaced) => Row,
) {
  const out: Token[] = [];
  const dir = side === "party" ? -1 : 1;
  const cols = columnsOf(list, rowOf);
  const labels: { row: Row; x: number }[] = [];
  for (const row of ["front", "back"] as const) {
    const first =
      row === "front" ? FROM_MIDDLE : FROM_MIDDLE + (cols.front - 1) * COLUMN_STEP + ROW_STEP;
    const xOf = (c: number) => middle + dir * (first + c * COLUMN_STEP);
    labels.push({ row, x: (xOf(0) + xOf(cols[row] - 1)) / 2 });
    list
      .filter((t) => rowOf(t) === row)
      .forEach((t, i) => {
        const c = Math.floor(i / PER_COLUMN);
        out.push({ ...t, x: xOf(c), y: TOP + (i % PER_COLUMN) * GAP + (c % 2) * (GAP / 2) });
      });
  }
  return { tokens: out, labels };
}

export function FightTokens({
  heroes,
  party,
  monsters,
  blows = [],
}: {
  heroes: readonly Hero[];
  party: readonly Bar[];
  monsters: readonly Bar[];
  /** The latest move: one blow, or each hit of a move on a whole group. */
  blows?: readonly CombatEvent[];
}) {
  const heroBy = new Map(heroes.map((h) => [h.id, h]));
  const ourList: Unplaced[] = party.map((bar) => {
    const h = heroBy.get(bar.uid);
    const ref = h ? heroIconRef(h) : { name: bar.name };
    return { bar, icon: ref.icon, iconName: ref.name, hero: h, label: bar.name, foe: false };
  });
  const ourRow = (t: Unplaced): Row => heroBy.get(t.bar.uid)?.row ?? "front";
  const theirList: Unplaced[] = monsters.map((bar) => {
    const ref = monsterIconRef(bar.sheet?.monsterId, bar.name);
    return { bar, icon: ref.icon, iconName: ref.name, label: bar.name, foe: true };
  });
  const theirRow = (t: Unplaced): Row => (t.bar.sheet?.row === "back" ? "back" : "front");
  // The middle line sits where the party's side ends, so each side gets the room it needs.
  const middle = reach(columnsOf(ourList, ourRow));
  const W = middle + reach(columnsOf(theirList, theirRow));
  const ours = place(ourList, "party", middle, ourRow);
  const theirs = place(theirList, "foes", middle, theirRow);
  const all = [...ours.tokens, ...theirs.tokens];
  const h = Math.max(...all.map((t) => t.y), TOP) + GAP - 10;
  const at = (uid?: string) => all.find((t) => t.bar.uid === uid);
  const lines = blows.flatMap((b) => {
    const from = at(b.actor);
    const to = at(b.target);
    return from && to ? [{ b, from, to }] : [];
  });
  const group = lines.length > 1;
  const struck = new Map(group ? lines.map((l) => [l.to.bar.uid, l.b.tone] as const) : []);
  return (
    <svg
      className="tokens"
      viewBox={`0 0 ${W} ${h}`}
      role="img"
      aria-label={`The fight: ${all.map((t) => `${t.label} ${t.bar.state === "up" ? `${t.bar.hp} of ${t.bar.max}` : t.bar.state}`).join(", ")}`}
    >
      <line x1={middle} x2={middle} y1={8} y2={h - 8} className="tokens-divide" />
      {[...ours.labels, ...theirs.labels].map((l) => (
        <text key={`${l.x}-${l.row}`} x={l.x} y={16} className="tokens-row">
          {l.row}
        </text>
      ))}
      {lines.map(({ b, from, to }) => (
        <path
          key={`${b.round}-${b.actor}-${b.target}-${b.text}`}
          d={`M${from.x} ${from.y} Q${(from.x + to.x) / 2} ${Math.min(from.y, to.y) - 30} ${to.x} ${to.y}`}
          className={`tokens-blow${group ? " group" : ""}${b.tone ? ` tone-${b.tone}` : ""}`}
        />
      ))}
      {all.map((t) => (
        <TokenView
          key={t.bar.uid}
          t={t}
          struck={struck.has(t.bar.uid) ? (struck.get(t.bar.uid) ?? "plain") : undefined}
        />
      ))}
    </svg>
  );
}

function TokenView({ t, struck }: { t: Token; struck?: "good" | "bad" | "plain" }) {
  const { bar, x, y } = t;
  const hp = Math.max(0, Math.min(1, bar.hp / bar.max));
  const mana = bar.maxMana ? Math.max(0, Math.min(1, (bar.mana ?? 0) / bar.maxMana)) : undefined;
  const out = bar.state !== "up";
  return (
    <g className={`token${t.foe ? " foe" : ""}${out ? " out" : ""}`}>
      <title>
        {bar.name}:{" "}
        {bar.state === "up" ? `${bar.hp}/${bar.max}` : bar.state === "dead" ? "dead" : "down"}
      </title>
      <circle cx={x} cy={y} r={R} className="token-disc" />
      {struck ? <circle cx={x} cy={y} r={R + 4} className={`token-struck tone-${struck}`} /> : null}
      {t.hero ? (
        <foreignObject x={x - R + 1} y={y - R + 1} width={2 * R - 2} height={2 * R - 2}>
          <Portrait hero={t.hero} size={2 * R - 2} className="token-face" />
        </foreignObject>
      ) : (
        <SvgIcon icon={t.icon} name={t.iconName} x={x} y={y} size={R * 1.5} />
      )}
      <rect x={x - 24} y={y + R + 4} width={48} height={4} className="token-track" />
      <rect
        x={x - 24}
        y={y + R + 4}
        width={48 * hp}
        height={4}
        className={`token-hp${hp < 0.3 ? " low" : ""}`}
      />
      {mana !== undefined ? (
        <>
          <rect x={x - 24} y={y + R + 9} width={48} height={3} className="token-track" />
          <rect x={x - 24} y={y + R + 9} width={48 * mana} height={3} className="token-mana" />
        </>
      ) : null}
      <text x={x} y={y + R + 24} textAnchor="middle" className="token-name">
        {shortName(bar.name)}
        {out ? (bar.state === "dead" ? " ✕" : " (down)") : ""}
      </text>
    </g>
  );
}

/** First word for heroes ("Ash"), the whole thing for short monster names. */
function shortName(name: string): string {
  return name.length <= 14 ? name : name.split(" ")[0]!;
}
