/**
 * A fight as tokens (M8.05, DESIGN.md §19.3): each side in its front and back
 * rows, one token per combatant with health (and mana) bars, a mark for the
 * downed and the dead, and the latest blow drawn from attacker to target. A
 * picture over the log, never instead of it: the lines below stay as they are.
 */
import type { IconRef } from "../content/types";
import type { CombatEvent } from "../sim/combat";
import type { Hero } from "../sim/hero";
import { heroIconRef, SvgIcon } from "./art/Icon";
import { ix } from "./game";
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
  last,
}: {
  heroes: readonly Hero[];
  party: readonly Bar[];
  monsters: readonly Bar[];
  last?: CombatEvent;
}) {
  const heroBy = new Map(heroes.map((h) => [h.id, h]));
  const ours = place(
    party.map((bar) => {
      const h = heroBy.get(bar.uid);
      const ref = h ? heroIconRef(h) : { name: bar.name };
      return { bar, icon: ref.icon, iconName: ref.name, label: bar.name, foe: false };
    }),
    "party",
    (t) => heroBy.get(t.bar.uid)?.row ?? "front",
  );
  const theirs = place(
    monsters.map((bar) => {
      const def = bar.sheet?.monsterId
        ? ix.lib.monsters.find((m) => m.id === bar.sheet!.monsterId)
        : undefined;
      return { bar, icon: def?.icon, iconName: def?.name ?? bar.name, label: bar.name, foe: true };
    }),
    "foes",
    (t) => (t.bar.sheet?.row === "back" ? "back" : "front"),
  );
  const all = [...ours, ...theirs];
  const rows = Math.max(1, ...all.map((t) => (t.y - TOP) / GAP + 1));
  const h = TOP + rows * GAP - 10;
  const at = (uid?: string) => all.find((t) => t.bar.uid === uid);
  const from = at(last?.actor);
  const to = at(last?.target);
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
      {from && to ? (
        <path
          key={`${last!.round}-${last!.actor}-${last!.target}-${last!.text}`}
          d={`M${from.x} ${from.y} Q${(from.x + to.x) / 2} ${Math.min(from.y, to.y) - 30} ${to.x} ${to.y}`}
          className={`tokens-blow${last!.tone ? ` tone-${last!.tone}` : ""}`}
        />
      ) : null}
      {all.map((t) => (
        <TokenView key={t.bar.uid} t={t} />
      ))}
    </svg>
  );
}

function TokenView({ t }: { t: Token }) {
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
      <SvgIcon icon={t.icon} name={t.iconName} x={x} y={y} size={R * 1.5} />
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
