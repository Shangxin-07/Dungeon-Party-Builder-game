/**
 * The pit, side on (M8.04, DESIGN.md §19.2): the town at the top and the
 * floors stacked below, each a little wider. Only what the town knows: how
 * full each floor felt and when, murk where nobody's been, seals on the
 * stairs, and parties below by the shaft (never where they really are).
 */
import type { FloorKnowledge, Outing, TownState } from "../sim/town";
import { ix } from "./game";
import { awayLine } from "./town/Away";

// Condensed in M8.09 (Mike: a little less tall): one line of words per floor.
const ROW = 32;
const BOX = 22;
const TOP = 34;

export interface SealView {
  floor: number;
  name: string;
  percent: number;
}

export function PitSide({
  town,
  known,
  seals,
  width,
}: {
  town: TownState;
  known: readonly FloorKnowledge[];
  seals: readonly SealView[];
  /** How full a floor feels from its band, 0-1. */
  width: (k: FloorKnowledge) => number;
}) {
  const h = TOP + known.length * ROW + 14;
  const outings: Outing[] = town.outings;
  return (
    <svg
      className="pitside"
      viewBox={`0 0 520 ${h}`}
      role="img"
      aria-label={`The pit, side on: ${known
        .map((k) => `floor ${k.depth} ${k.band ?? "unknown"}`)
        .join(", ")}`}
    >
      <rect width={520} height={h} fill="var(--pit-rock)" />
      {/* Ground level and the mouth of the pit. */}
      <path d="M0 24 H170 L186 32 H254 L270 24 H520" stroke="#4c4230" strokeWidth={3} fill="none" />
      <text x={12} y={17} className="pitside-note">
        the town
      </text>
      {known.map((k, i) => {
        const def = ix.floor(k.depth);
        const y = TOP + i * ROW;
        const x = 170 - i * 9;
        const w = 100 + i * 18;
        const full = width(k);
        const tone = full >= 0.75 ? "var(--bad)" : full >= 0.4 ? "var(--accent)" : "var(--good)";
        const seal = seals.find((s) => s.floor === k.depth);
        return (
          <g key={k.depth}>
            <rect x={x} y={y} width={w} height={BOX} rx={4} fill="#221e18" stroke="#3a3226" />
            {k.band ? (
              <rect
                x={x}
                y={y + BOX - BOX * Math.max(full, 0.08)}
                width={w}
                height={BOX * Math.max(full, 0.08)}
                rx={3}
                fill={tone}
                opacity={k.stale ? 0.3 : 0.55}
              />
            ) : (
              Array.from({ length: 6 }, (_, j) => (
                <ellipse
                  key={j}
                  cx={x + 16 + j * ((w - 32) / 5)}
                  cy={y + 10 + (j % 2) * 4}
                  rx={13}
                  ry={5}
                  fill="#3a352c"
                  opacity={0.55}
                />
              ))
            )}
            <text x={x - 8} y={y + 16} textAnchor="end" className="pitside-floor">
              {k.depth}
            </text>
            <text x={x + w + 10} y={y + 15} className="pitside-name">
              {def.name}
              <tspan className={`pitside-note${k.stale ? " stale" : ""}`} dx={8}>
                {k.band ?? "unknown"} ·{" "}
                {k.source === "none"
                  ? "no word"
                  : k.source === "watch"
                    ? "the watch, today"
                    : `${k.by ?? k.source}, ${k.daysAgo ? `${k.daysAgo}d ago` : "today"}`}
              </tspan>
            </text>
            {i < known.length - 1 ? (
              <line
                x1={x + w - 14}
                x2={x + w - 6}
                y1={y + BOX}
                y2={y + ROW}
                stroke="#5b5240"
                strokeWidth={3}
              />
            ) : null}
            {seal ? (
              <g>
                {[0, 1, 2].map((p) => (
                  <rect
                    key={p}
                    x={x + w - 30 + p * 4}
                    y={y + BOX + 1 + p * 3}
                    width={28}
                    height={3}
                    fill={seal.name.toLowerCase().includes("iron") ? "#8b8f96" : "#b08a52"}
                    transform={`rotate(${p % 2 ? 8 : -8} ${x + w - 16} ${y + BOX + 5})`}
                  />
                ))}
                <text
                  x={x + w - 36}
                  textAnchor="end"
                  y={y + BOX + 9}
                  className={`pitside-seal${seal.percent < 34 ? " stale" : ""}`}
                >
                  sealed {seal.percent}%
                </text>
              </g>
            ) : null}
          </g>
        );
      })}
      {outings.map((o, i) => (
        <g key={o.id}>
          <circle cx={150 - i * 4} cy={TOP + 20 + i * 16} r={5} fill="var(--accent)" />
          <text x={140 - i * 4} y={TOP + 24 + i * 16} textAnchor="end" className="pitside-party">
            {o.name}: {awayLine(town, o).text.split(" · ")[0]}
          </text>
        </g>
      ))}
    </svg>
  );
}
