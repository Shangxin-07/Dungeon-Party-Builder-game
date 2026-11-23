/**
 * The town map's drawings (M8, DESIGN.md §19): one parametric drawing per
 * shape family that grows with the building's level, sign glyphs, and
 * scaffolding for work in progress. A building with `art.sprite` is drawn
 * from its sprite sheet instead. Everything stands on its door point (x, y).
 */
import type { BuildingArt, SignGlyph } from "../../../content/types";
import { SPRITES, spriteFrame } from "./sprites";

const WALL = "#5a4a38";
const EDGE = "#120f0b";
const GLOW = "#e8c271";
const ACCENT = "#e0a64b";
const TIMBER = "#b08a52";
/** Sprite frames are drawn this wide on the map, in map units. */
export const SPRITE_WIDTH = 124;

/** Width and height of a drawn building, so scaffolding and labels fit round it. */
export function footprint(art: BuildingArt, level: number): { w: number; h: number } {
  const l = Math.max(level, 1);
  const sheet = art.sprite && SPRITES[art.sprite.sheet];
  if (sheet) {
    // Frames share one ground line and size, so a low level fills less of its frame.
    const full = (SPRITE_WIDTH * sheet.frameHeight) / sheet.frameWidth;
    return { w: SPRITE_WIDTH * 0.6, h: full * 0.8 };
  }
  switch (art.shape) {
    case "tower":
      return { w: 22 + l * 4, h: 48 + l * 14 };
    case "field":
      return { w: 80 + l * 12, h: 34 };
    case "graves":
    case "yard":
    case "stalls":
      return { w: 40 + l * 12, h: 28 };
    case "cottages":
      return { w: 70, h: 18 + Math.ceil(l / 1.5) * 22 };
    default:
      return { w: 34 + l * 10, h: 30 + Math.min(l, 3) * 9 + (l >= 3 ? 24 : 0) };
  }
}

export function Glyph({ kind, x, y }: { kind: SignGlyph; x: number; y: number }) {
  const s = {
    stroke: ACCENT,
    strokeWidth: 1.4,
    fill: "none",
    strokeLinecap: "round" as const,
  };
  const a = x;
  const b = y;
  const mark = (() => {
    switch (kind) {
      case "shield":
        return <path d={`M${a - 4} ${b - 4}h8v3c0 3-2 5-4 6c-2-1-4-3-4-6z`} {...s} />;
      case "mug":
        return <path d={`M${a - 4} ${b - 3}h6v7h-6zM${a + 2} ${b - 1}h2v3h-2`} {...s} />;
      case "coin":
        return <circle cx={a} cy={b} r={3.5} {...s} />;
      case "anvil":
        return (
          <path
            d={`M${a - 5} ${b - 2}h9l-2 3h-5zM${a - 1} ${b + 1}v3M${a - 3} ${b + 4}h5`}
            {...s}
          />
        );
      case "flask":
        return <path d={`M${a - 1} ${b - 5}v3l-3 6h8l-3-6v-3`} {...s} />;
      case "sword":
        return <path d={`M${a - 4} ${b + 4}l8-8M${a - 3} ${b + 1}l2 2`} {...s} />;
      case "book":
        return (
          <path
            d={`M${a - 5} ${b - 3}h4c1 0 1 1 1 1v6c0-1-1-1-1-1h-4zM${a + 5} ${b - 3}h-4M${a + 5} ${b - 3}v6h-4`}
            {...s}
          />
        );
      case "sun":
        return (
          <>
            <circle cx={a} cy={b} r={2.2} {...s} />
            <path
              d={`M${a} ${b - 5}v1.5M${a} ${b + 5}v-1.5M${a - 5} ${b}h1.5M${a + 5} ${b}h-1.5`}
              {...s}
            />
          </>
        );
      case "eye":
        return (
          <>
            <path d={`M${a - 5} ${b}q5-5 10 0q-5 5-10 0`} {...s} />
            <circle cx={a} cy={b} r={1.3} fill={ACCENT} />
          </>
        );
      case "saw":
        return (
          <path
            d={`M${a - 5} ${b + 2}h10M${a - 5} ${b + 2}l1-3l1 3l1-3l1 3l1-3l1 3l1-3l1 3l1-3`}
            {...s}
          />
        );
      case "key":
        return (
          <path
            d={`M${a - 4} ${b}a2 2 0 1 0 4 0a2 2 0 1 0 -4 0M${a} ${b}h5M${a + 3} ${b}v2`}
            {...s}
          />
        );
    }
  })();
  return (
    <g aria-hidden="true">
      <circle cx={x} cy={y} r={7} fill="#1b1813" stroke={ACCENT} strokeWidth={1} />
      {mark}
    </g>
  );
}

function shade(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16);
  const c = [n >> 16, (n >> 8) & 255, n & 255].map((v) =>
    Math.max(0, Math.min(255, Math.round(v * f))),
  );
  return "#" + c.map((v) => v.toString(16).padStart(2, "0")).join("");
}

/** A building drawn from its shape family. `ghost` = dashed outline of what's coming. */
export function Drawn({
  art,
  x,
  y,
  level,
  ghost = false,
}: {
  art: BuildingArt;
  x: number;
  y: number;
  level: number;
  ghost?: boolean;
}) {
  const l = Math.max(level, 1);
  const roof = ghost ? "none" : (art.roof ?? "#6b5a44");
  const wall = ghost ? "none" : WALL;
  const st = ghost
    ? { stroke: "#a89c88", strokeDasharray: "3 3", strokeWidth: 1 }
    : { stroke: EDGE, strokeWidth: 1 };
  const w = 34 + l * 10;
  const h = 18 + Math.min(l, 3) * 7;
  const windows = !ghost ? (
    <>
      <rect x={x - 10} y={y - h / 2 - 3} width={5} height={5} fill={GLOW} opacity={0.8} />
      <rect x={x + 4} y={y - h / 2 - 3} width={5} height={5} fill={GLOW} opacity={0.8} />
    </>
  ) : null;
  switch (art.shape) {
    case "hall":
    case "block":
      return (
        <g>
          <rect x={x - w / 2} y={y - h} width={w} height={h} fill={wall} {...st} />
          <path
            d={`M${x - w / 2 - 4} ${y - h}L${x} ${y - h - 14 - l * 2}L${x + w / 2 + 4} ${y - h}z`}
            fill={roof}
            {...st}
          />
          {l >= 3 && !ghost ? (
            <>
              <rect x={x - 6} y={y - h - 34} width={12} height={20} fill={wall} {...st} />
              <path
                d={`M${x - 8} ${y - h - 34}L${x} ${y - h - 44}L${x + 8} ${y - h - 34}z`}
                fill={roof}
                {...st}
              />
            </>
          ) : null}
          {l >= 4 && !ghost ? (
            <path d={`M${x} ${y - h - 44}v-12l10 4l-10 4`} fill={ACCENT} stroke={ACCENT} />
          ) : null}
          {windows}
        </g>
      );
    case "tower": {
      const tw = 22 + l * 4;
      const th = 30 + l * 14;
      return (
        <g>
          <rect x={x - tw / 2} y={y - th} width={tw} height={th} fill={wall} {...st} />
          <path
            d={`M${x - tw / 2 - 3} ${y - th}L${x} ${y - th - 18}L${x + tw / 2 + 3} ${y - th}z`}
            fill={roof}
            {...st}
          />
          {windows}
        </g>
      );
    }
    case "temple":
      return (
        <g>
          <rect
            x={x - w / 2}
            y={y - h}
            width={w}
            height={h}
            fill={ghost ? "none" : "#8a7f6a"}
            {...st}
          />
          {[0, 1, 2, 3].map((i) => {
            const cx = x - w / 2 + 6 + (i * (w - 12)) / 3;
            return <line key={i} x1={cx} x2={cx} y1={y - h + 2} y2={y} stroke="#5c5444" />;
          })}
          <path
            d={`M${x - w / 2 - 4} ${y - h}L${x} ${y - h - 12}L${x + w / 2 + 4} ${y - h}z`}
            fill={roof}
            {...st}
          />
        </g>
      );
    case "stalls":
      return (
        <g>
          {Array.from({ length: 1 + l }, (_, i) => {
            const sx = x - 9 * l + i * 18;
            return (
              <g key={i}>
                <rect x={sx - 7} y={y - 12} width={14} height={12} fill={wall} {...st} />
                <path
                  d={`M${sx - 9} ${y - 12}h18l-3 -6h-12z`}
                  fill={ghost ? "none" : i % 2 ? "#a0523a" : roof}
                  {...st}
                />
              </g>
            );
          })}
        </g>
      );
    case "yard":
      return (
        <g>
          <rect
            x={x - w / 2 - 6}
            y={y - 24}
            width={w + 12}
            height={26}
            fill={ghost ? "none" : "#3b3222"}
            stroke="#7a5c3a"
            strokeDasharray="2 2"
          />
          {Array.from({ length: 1 + l }, (_, i) => {
            const dx = x - w / 2 + 6 + i * 14;
            return (
              <g key={i} stroke="#c2a172" strokeWidth={2} opacity={ghost ? 0.4 : 1}>
                <line x1={dx} x2={dx} y1={y - 2} y2={y - 16} />
                <line x1={dx - 5} x2={dx + 5} y1={y - 12} y2={y - 12} />
                <circle cx={dx} cy={y - 19} r={3} fill="#c2a172" stroke="none" />
              </g>
            );
          })}
        </g>
      );
    case "graves":
      return (
        <g opacity={ghost ? 0.4 : 1}>
          {Array.from({ length: 2 + l * 3 }, (_, i) => {
            const gx = x - 18 + (i % 4) * 12;
            const gy = y - 22 + Math.floor(i / 4) * 12;
            return <path key={i} d={`M${gx - 3} ${gy + 6}v-6a3 3 0 0 1 6 0v6z`} fill="#6f6a60" />;
          })}
        </g>
      );
    case "field": {
      const fw = 80 + l * 12;
      return (
        <g opacity={ghost ? 0.4 : 1}>
          <rect
            x={x - fw / 2}
            y={y - 30}
            width={fw}
            height={34}
            fill="#3d3a1e"
            stroke={art.roof ?? "#6b5a2a"}
          />
          {Array.from({ length: 6 + l * 2 }, (_, i) => {
            const fx = x - fw / 2 + 5 + i * 9;
            return (
              <line
                key={i}
                x1={fx}
                x2={fx}
                y1={y - 26}
                y2={y}
                stroke="#8a8a3a"
                strokeWidth={2}
                strokeDasharray="3 2"
              />
            );
          })}
        </g>
      );
    }
    case "cottages":
      return (
        <g>
          {Array.from({ length: l * 2 }, (_, i) => {
            const cx = x - 24 + (i % 3) * 24;
            const cy = y - Math.floor(i / 3) * 22;
            return (
              <g key={i}>
                <rect x={cx - 8} y={cy - 10} width={16} height={10} fill={wall} {...st} />
                <path
                  d={`M${cx - 10} ${cy - 10}L${cx} ${cy - 18}L${cx + 10} ${cy - 10}z`}
                  fill={roof}
                  {...st}
                />
              </g>
            );
          })}
        </g>
      );
    default:
      return (
        <g>
          <rect x={x - w / 2} y={y - h} width={w} height={h} fill={wall} {...st} />
          <path
            d={`M${x - w / 2 - 4} ${y - h}L${x} ${y - h - 12 - l * 2}L${x + w / 2 + 4} ${y - h}z`}
            fill={roof}
            {...st}
          />
          {l >= 2 && !ghost ? (
            <rect
              x={x + w / 2}
              y={y - h * 0.7}
              width={14}
              height={h * 0.7}
              fill={shade(WALL, 0.85)}
              {...st}
            />
          ) : null}
          {art.smoke && !ghost ? <Smoke x={x - w / 2 + 8} y={y - h - 18} /> : null}
          {windows}
        </g>
      );
  }
}

export function Smoke({ x, y, dark = false }: { x: number; y: number; dark?: boolean }) {
  return (
    <g className="map-smoke" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <circle
          key={i}
          cx={x + i * (dark ? 5 : 4)}
          cy={y - i * (dark ? 9 : 7)}
          r={(dark ? 4 : 3) + i * (dark ? 2 : 1)}
          fill={dark ? "#555" : "#777"}
          opacity={(dark ? 0.5 : 0.35) - i * 0.1}
        />
      ))}
    </g>
  );
}

/** A frame of a sprite sheet, bottom-centred on (x, y). */
export function Sprite({
  art,
  x,
  y,
  level,
  ghost = false,
}: {
  art: BuildingArt;
  x: number;
  y: number;
  level: number;
  ghost?: boolean;
}) {
  const sprite = art.sprite;
  const sheet = sprite && SPRITES[sprite.sheet];
  if (!sprite || !sheet) return <Drawn art={art} x={x} y={y} level={level} ghost={ghost} />;
  const frame = spriteFrame(sprite.frames, level);
  const w = SPRITE_WIDTH;
  const h = (w * sheet.frameHeight) / sheet.frameWidth;
  return (
    <svg
      x={x - w / 2}
      y={y - h}
      width={w}
      height={h}
      viewBox={`${frame * sheet.frameWidth} 0 ${sheet.frameWidth} ${sheet.frameHeight}`}
      opacity={ghost ? 0.35 : 1}
      className={ghost ? "map-ghost" : undefined}
      overflow="hidden"
    >
      <image
        href={sheet.url}
        width={sheet.frameWidth * sheet.count}
        height={sheet.frameHeight}
        preserveAspectRatio="none"
      />
    </svg>
  );
}

/** Any building's look: its sprite if it has one, else its drawing. */
export function Look(props: {
  art: BuildingArt;
  x: number;
  y: number;
  level: number;
  ghost?: boolean;
}) {
  return props.art.sprite ? <Sprite {...props} /> : <Drawn {...props} />;
}

/** Poles and a crossbar round a building being built or upgraded. */
export function Scaffold({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  const left = x - w / 2 - 3;
  const right = x + w / 2 + 3;
  return (
    <g stroke={TIMBER} strokeWidth={1.5} aria-hidden="true">
      <line x1={left} x2={left} y1={y} y2={y - h - 8} />
      <line x1={x} x2={x} y1={y} y2={y - h - 8} opacity={0.6} />
      <line x1={right} x2={right} y1={y} y2={y - h - 8} />
      <line x1={left - 3} x2={right + 3} y1={y - h * 0.5} y2={y - h * 0.5} />
      <line x1={left - 3} x2={right + 3} y1={y - h - 2} y2={y - h - 2} />
    </g>
  );
}

/** Broken roof line and smoke: a raid got to it. */
export function Damage({ x, y, h }: { x: number; y: number; h: number }) {
  return (
    <g aria-hidden="true">
      <path
        d={`M${x - 20} ${y - h * 0.3}l8 -10l6 8l10 -12l8 14`}
        stroke="#c98b7f"
        strokeWidth={2}
        fill="none"
      />
      <Smoke x={x + 8} y={y - h - 8} dark />
    </g>
  );
}
