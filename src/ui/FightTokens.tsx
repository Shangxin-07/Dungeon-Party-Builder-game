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

const W = 520;
const R = 19;
const GAP = 64;
const TOP = 40;

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

/** x of each column: party back, party front | foes front, foes back. */
const COLUMN = { party: { back: 62, front: 170 }, foes: { front: 350, back: 458 } } as const;

function place(
  list: Omit<Token, "x" | "y">[],
  side: "party" | "foes",
  rowOf: (t: Omit<Token, "x" | "y">) => "front" | "back",
) {
  const out: Token[] = [];
  for (const row of ["front", "back"] as const) {
    const inRow = list.filter((t) => rowOf(t) === row);
    inRow.forEach((t, i) => out.push({ ...t, x: COLUMN[side][row], y: TOP + i * GAP }));
  }
  return out;
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
  const ours = place(
    party.map((bar) => {
      const h = heroBy.get(bar.uid);
      const ref = h ? heroIconRef(h) : { name: bar.name };
      return { bar, icon: ref.icon, iconName: ref.name, hero: h, label: bar.name, foe: false };
    }),
    "party",
    (t) => heroBy.get(t.bar.uid)?.row ?? "front",
  );
  const theirs = place(
    monsters.map((bar) => {
      const ref = monsterIconRef(bar.sheet?.monsterId, bar.name);
      return { bar, icon: ref.icon, iconName: ref.name, label: bar.name, foe: true };
    }),
    "foes",
    (t) => (t.bar.sheet?.row === "back" ? "back" : "front"),
  );
  const all = [...ours, ...theirs];
  const rows = Math.max(1, ...all.map((t) => (t.y - TOP) / GAP + 1));
  const h = TOP + rows * GAP - 10;
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
      <line x1={W / 2} x2={W / 2} y1={8} y2={h - 8} className="tokens-divide" />
      <text x={COLUMN.party.back} y={16} className="tokens-row">
        back
      </text>
      <text x={COLUMN.party.front} y={16} className="tokens-row">
        front
      </text>
      <text x={COLUMN.foes.front} y={16} className="tokens-row">
        front
      </text>
      <text x={COLUMN.foes.back} y={16} className="tokens-row">
        back
      </text>
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
