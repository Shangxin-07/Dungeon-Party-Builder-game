/**
 * The ground under the town map (M8.09): Mike found the plain backdrop bland.
 * Grass patches, tufts, stones and a ring of trees outside the palisade, all
 * scattered from a fixed seed so the map looks the same every time; worn
 * footpaths run from the pit to every building that stands. Nothing here is
 * clickable, and nothing is drawn where a plot, the road or the pit sits.
 */
import type { TownMapDef } from "../../../content/types";
import type { MapBuilding } from "./scene";

/** A small steady random stream (mulberry32), so the scatter never changes. */
function stream(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Spot {
  x: number;
  y: number;
}

/** Is (x, y) clear of every plot's drawing, the road and the pit's spoil? */
export function clearOf(map: TownMapDef, x: number, y: number, margin = 0): boolean {
  const { pit } = map;
  const dx = (x - pit.x) / (pit.rx * 1.7 + margin);
  const dy = (y - pit.y) / (pit.ry * 1.8 + margin);
  if (dx * dx + dy * dy < 1) return false;
  if (Math.abs(x - pit.x) < 22 + margin && y > pit.y) return false; // the road
  for (const p of Object.values(map.plots))
    if (Math.abs(x - p.x) < 62 + margin && y > p.y - 100 - margin && y < p.y + 22 + margin)
      return false;
  return true;
}

/** Inside the palisade's ring (scaled by `k`)? */
function inside(map: TownMapDef, x: number, y: number, k = 1): boolean {
  const dx = (x - map.pit.x) / (map.wall.rx * k);
  const dy = (y - map.pit.y) / (map.wall.ry * k);
  return dx * dx + dy * dy < 1;
}

export interface GroundScatter {
  patches: (Spot & { rx: number; ry: number; tone: number })[];
  tufts: (Spot & { tall: boolean })[];
  stones: (Spot & { r: number })[];
  flowers: (Spot & { tone: number })[];
  trees: (Spot & { r: number; tone: number })[];
}

/** Where every patch, tuft, stone, flower and tree goes. Pure. */
export function groundScatter(map: TownMapDef): GroundScatter {
  const rnd = stream(0x9e1d);
  const at = () => ({ x: rnd() * map.width, y: rnd() * map.height });
  const out: GroundScatter = { patches: [], tufts: [], stones: [], flowers: [], trees: [] };
  for (let i = 0; i < 26; i++) {
    const p = at();
    out.patches.push({
      ...p,
      rx: 30 + rnd() * 60,
      ry: 12 + rnd() * 22,
      tone: Math.floor(rnd() * 3),
    });
  }
  for (let i = 0; i < 220; i++) {
    const p = at();
    // Fewer tufts on the trampled ground inside the ring.
    if (inside(map, p.x, p.y, 0.9) && rnd() < 0.6) continue;
    if (clearOf(map, p.x, p.y)) out.tufts.push({ ...p, tall: rnd() < 0.3 });
  }
  for (let i = 0; i < 60; i++) {
    const p = at();
    if (clearOf(map, p.x, p.y)) out.stones.push({ ...p, r: 1.5 + rnd() * 2.5 });
  }
  for (let i = 0; i < 50; i++) {
    const p = at();
    if (!inside(map, p.x, p.y, 1.05) && clearOf(map, p.x, p.y))
      out.flowers.push({ ...p, tone: Math.floor(rnd() * 3) });
  }
  // Woods crowd the edges of the map, outside the ring, thinning inwards.
  for (let i = 0; i < 400 && out.trees.length < 70; i++) {
    const p = at();
    const edge = Math.min(p.x, map.width - p.x, p.y * 1.4, (map.height - p.y) * 1.4);
    if (rnd() * 140 < edge) continue;
    if (inside(map, p.x, p.y, 1.12) || !clearOf(map, p.x, p.y, 14)) continue;
    out.trees.push({ ...p, r: 9 + rnd() * 8, tone: Math.floor(rnd() * 3) });
  }
  out.trees.sort((a, b) => a.y - b.y);
  return out;
}

const GRASS = ["#252a1b", "#23271a", "#272c1d"];
const BLOOM = ["#a8904a", "#8c6a8a", "#b8b0a0"];
const LEAF = ["#26361f", "#2d3d22", "#1f2d1a"];
const LEAF_LIT = ["#34482a", "#3b4d2c", "#2b3d24"];

/** The ground layers, under everything else on the map. */
export function Ground({ map, buildings }: { map: TownMapDef; buildings: readonly MapBuilding[] }) {
  const g = groundScatter(map);
  const { pit } = map;
  return (
    <g className="map-ground" aria-hidden="true">
      {g.patches.map((p, i) => (
        <g key={i} fill={GRASS[p.tone]}>
          <ellipse cx={p.x} cy={p.y} rx={p.rx} ry={p.ry} />
          <ellipse cx={p.x - p.rx * 0.5} cy={p.y + p.ry * 0.4} rx={p.rx * 0.6} ry={p.ry * 0.8} />
          <ellipse cx={p.x + p.rx * 0.55} cy={p.y - p.ry * 0.3} rx={p.rx * 0.5} ry={p.ry * 0.7} />
        </g>
      ))}
      {/* Inside the ring the ground is trodden bare. */}
      <ellipse
        cx={pit.x}
        cy={pit.y}
        rx={map.wall.rx * 0.92}
        ry={map.wall.ry * 0.9}
        fill="var(--map-trodden)"
      />
      {/* Worn footpaths from the pit's lip to each building's door. */}
      {buildings
        .filter((b) => b.at && b.level > 0)
        .map((b) => {
          const { x, y } = b.at!;
          const a = Math.atan2(y - pit.y, x - pit.x);
          const sx = pit.x + Math.cos(a) * pit.rx * 1.45;
          const sy = pit.y + Math.sin(a) * pit.ry * 1.5;
          const mx = (sx + x) / 2 + (y - pit.y) * 0.08;
          const my = (sy + y) / 2 - (x - pit.x) * 0.04;
          return (
            <path
              key={b.def.id}
              d={`M${sx} ${sy} Q${mx} ${my} ${x} ${y + 4}`}
              className="map-path"
            />
          );
        })}
      {g.stones.map((s, i) => (
        <ellipse key={i} cx={s.x} cy={s.y} rx={s.r} ry={s.r * 0.7} fill="var(--map-stone)" />
      ))}
      {g.tufts.map((t, i) => (
        <path
          key={i}
          d={
            t.tall
              ? `M${t.x - 3} ${t.y}l1 -5M${t.x} ${t.y}v-7M${t.x + 3} ${t.y}l-1 -5`
              : `M${t.x - 2} ${t.y}l1 -3M${t.x + 1} ${t.y}v-4`
          }
          className="map-tuft"
        />
      ))}
      {g.flowers.map((f, i) => (
        <rect key={i} x={f.x} y={f.y} width={2.5} height={2.5} fill={BLOOM[f.tone]} />
      ))}
      {g.trees.map((t, i) => (
        <g key={i}>
          <ellipse cx={t.x} cy={t.y + 2} rx={t.r * 0.9} ry={t.r * 0.3} fill="#14160f" />
          <rect x={t.x - 1.5} y={t.y - t.r * 0.6} width={3} height={t.r * 0.6 + 2} fill="#3b2c1c" />
          <circle cx={t.x} cy={t.y - t.r} r={t.r} fill={LEAF[t.tone]} />
          <circle
            cx={t.x - t.r * 0.3}
            cy={t.y - t.r * 1.3}
            r={t.r * 0.55}
            fill={LEAF_LIT[t.tone]}
          />
        </g>
      ))}
    </g>
  );
}
