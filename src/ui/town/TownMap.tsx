/**
 * The town map (M8.01, DESIGN.md §19.1): the pit in the middle of town, the
 * wall round it, and every building on its plot, growing with its level.
 * Display only: it reads the town and never changes it. Hover or tap shows a
 * line about a building; a click opens its panel.
 */
import { Ground } from "./map/ground";
import { useState, type KeyboardEvent, type ReactNode } from "react";
import { Fold, showFold } from "../Fold";
import type { TownState } from "../../sim/town";
import { ix } from "../game";
import { Damage, Glyph, Look, Scaffold, footprint } from "./map/draw";
import { SPRITES } from "./map/sprites";
import { sceneSummary, townScene, type MapBuilding } from "./map/scene";

const HINT = "Point at or tap a building to see what it does. Click it to open it.";

export function TownMap({ town }: { town: TownState }) {
  const scene = townScene(ix, town);
  const map = ix.lib.townMap;
  const [said, say] = useState(HINT);
  const { x: px, y: py, rx: prx, ry: pry } = map.pit;
  const by = (shape: string) => scene.buildings.find((b) => b.art.shape === shape);
  const wall = by("wall");
  const gate = by("gate");
  const towers = by("watchtowers");
  const cage = by("headframe");
  const plots = scene.buildings.filter((b) => b.at);
  const last = town.pit.at(-1);

  /** Hover, focus and click for one thing on the map. */
  const spot = (caption: string, open: () => void, children: ReactNode, key?: string) => (
    <g
      key={key}
      className="map-spot"
      role="button"
      tabIndex={0}
      aria-label={caption}
      onMouseEnter={() => say(caption)}
      onFocus={() => say(caption)}
      onClick={open}
      onKeyDown={(e: KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          open();
        }
      }}
    >
      {children}
    </g>
  );
  const openBuilding = (b: MapBuilding) => () => showFold("buildings", `building-${b.def.id}`);

  const pitCaption =
    "The Pit. " +
    (last
      ? `Last night ${last.strength} strength climbed out (day ${last.day}). `
      : "Nothing has climbed out yet. ") +
    "Click for the pit: how full the floors are and what the defences hold.";

  return (
    <Fold id="townmap" title="Town map" summary={sceneSummary(scene)} defaultOpen>
      <svg
        className="townmap"
        viewBox={`0 0 ${map.width} ${map.height}`}
        role="group"
        aria-label="Map of the town round the pit"
        onMouseLeave={() => say(HINT)}
      >
        <rect width={map.width} height={map.height} fill="var(--map-ground)" />
        <Ground map={map} buildings={scene.buildings} />
        {/* The road out through the gate, and the trampled spoil round the pit. */}
        <path
          d={`M${px} ${map.height} Q${px + 5} ${py + map.wall.ry - 30} ${px} ${py + pry + 30}`}
          stroke="var(--map-road)"
          strokeWidth={18}
          fill="none"
        />
        <ellipse cx={px} cy={py} rx={prx * 1.56} ry={pry * 1.63} fill="var(--map-spoil)" />

        {wall ? <Wall b={wall} map={map} spot={spot} open={openBuilding(wall)} /> : null}

        {spot(
          pitCaption,
          () => showFold("pit", "pit-heading"),
          <g>
            <ellipse
              cx={px}
              cy={py}
              rx={prx}
              ry={pry}
              fill="#3b3325"
              stroke="#4c4230"
              strokeWidth={3}
            />
            <ellipse cx={px} cy={py + 4} rx={prx * 0.81} ry={pry * 0.78} fill="#120f0b" />
            <ellipse cx={px} cy={py + 10} rx={prx * 0.54} ry={pry * 0.48} fill="#060504" />
            <ellipse className="pit-glow" cx={px} cy={py + 14} rx={22} ry={9} fill="#5a2a1a" />
            <text x={px} y={py + pry + 14} textAnchor="middle" className="map-pit-name">
              THE PIT
            </text>
          </g>,
        )}

        {cage?.art.sprite && (cage.level || cage.work) ? (
          spot(
            cage.caption,
            openBuilding(cage),
            // The headframe's feet stand either side of the hole.
            <Look
              art={cage.art}
              x={px}
              y={py + pry * 0.5}
              level={cage.level || cage.work!.level}
              ghost={!cage.level}
            />,
          )
        ) : cage && cage.level > 0 ? (
          spot(
            cage.caption,
            openBuilding(cage),
            <g>
              <path
                d={`M${px - 30} ${py - 20} L${px - 10} ${py - 90} L${px + 10} ${py - 90} L${px + 30} ${py - 20} M${px - 20} ${py - 50} H${px + 20}`}
                stroke="#8b8f96"
                strokeWidth={3}
                fill="none"
              />
              <circle cx={px} cy={py - 92} r={9} fill="none" stroke="#b8bcc4" strokeWidth={3} />
            </g>,
          )
        ) : (
          <g aria-hidden="true">
            <path
              d={`M${px - 25} ${py - 28} L${px - 12} ${py - 52} L${px + 12} ${py - 52} L${px + 25} ${py - 28}`}
              stroke="#8a6a3a"
              strokeWidth={3}
              fill="none"
            />
            <line
              x1={px - 12}
              x2={px + 12}
              y1={py - 48}
              y2={py - 48}
              stroke="#c2a172"
              strokeWidth={4}
            />
          </g>
        )}
        {cage?.work && !cage.level ? (
          <text x={px + 34} y={py - 60} className="map-work">
            Mine Cage: {cage.work.daysLeft} days
          </text>
        ) : null}

        {scene.camp ? <Camp scene={scene} px={px} py={py} pry={pry} /> : null}

        {plots.map((b) => spot(b.caption, openBuilding(b), <OnPlot b={b} />, b.def.id))}

        {gate ? (
          <Gate b={gate} x={px} y={py + map.wall.ry} spot={spot} open={openBuilding(gate)} />
        ) : null}
        {towers ? <Towers b={towers} map={map} spot={spot} open={openBuilding(towers)} /> : null}

        {/* Heroes at posts and benches round the pit; townsfolk on the road in. */}
        {Array.from({ length: Math.min(scene.working, 16) }, (_, i) => {
          const a = Math.PI * (0.15 + (i % 8) * 0.1) + (i >= 8 ? Math.PI : 0);
          return (
            <circle
              key={`w${i}`}
              cx={px + Math.cos(a) * (prx + 14)}
              cy={py + Math.sin(a) * (pry + 10)}
              r={3.5}
              fill="var(--accent)"
              stroke="#120f0b"
            />
          );
        })}
        {Array.from({ length: Math.min(scene.folk, 24) }, (_, i) => (
          <circle
            key={`f${i}`}
            cx={px + 48 + (i % 6) * 9}
            cy={map.height - 18 - Math.floor(i / 6) * 9}
            r={2.6}
            fill="#c9bda8"
          />
        ))}
      </svg>
      <p className="map-caption" aria-live="polite">
        {said}
      </p>
    </Fold>
  );
}

type Spot = (caption: string, open: () => void, children: ReactNode, key?: string) => ReactNode;

/** A building on its plot: its look, scaffolding, damage, sign and name. */
function OnPlot({ b }: { b: MapBuilding }) {
  const { x, y } = b.at!;
  const { art, level, work } = b;
  const shown = level || (work ? work.level : 1);
  const size = footprint(art, shown);
  // Picture art carries its own sign.
  const glyph = art.sign && level && !art.sprite ? art.sign : undefined;
  const nameY = y + (glyph ? 30 : 16);
  return (
    <g>
      {level ? <Look art={art} x={x} y={y} level={level} /> : null}
      {work ? (
        <>
          {level ? null : <Look art={art} x={x} y={y} level={work.level} ghost />}
          <Scaffold x={x} y={y} w={size.w} h={size.h} />
        </>
      ) : null}
      {b.damaged ? <Damage x={x} y={y} h={size.h} /> : null}
      {glyph ? <Glyph kind={glyph} x={x} y={y + 10} /> : null}
      <text x={x} y={nameY} textAnchor="middle" className="map-label">
        {b.def.name}
      </text>
      {work ? (
        <text x={x} y={nameY + 14} textAnchor="middle" className="map-work">
          {workWords(level, work.level, work.daysLeft)}
        </text>
      ) : null}
    </g>
  );
}

function workWords(level: number, to: number, days: number): string {
  const when = days <= 0 ? "tomorrow" : `in ${days} day${days === 1 ? "" : "s"}`;
  return level
    ? `level ${to} ${when}`
    : days <= 0
      ? "ready tomorrow"
      : `${days} day${days === 1 ? "" : "s"}`;
}

/** The palisade: stakes at level 1, stone after. Dashed and faint while the first level goes up. */
function Wall({
  b,
  map,
  spot,
  open,
}: {
  b: MapBuilding;
  map: typeof ix.lib.townMap;
  spot: Spot;
  open: () => void;
}) {
  const stone = b.level >= 2;
  const { x, y } = map.pit;
  const ring = (
    <ellipse
      cx={x}
      cy={y}
      rx={map.wall.rx}
      ry={map.wall.ry}
      fill="none"
      stroke={b.level ? (stone ? "#7d786e" : "#7c5a34") : "#7c5a34"}
      strokeWidth={b.level >= 3 ? 9 : stone ? 7 : 4}
      strokeDasharray={stone ? "14 2" : "3 3"}
      opacity={b.level ? 1 : 0.35}
      className="map-wall"
    />
  );
  return (
    <>
      {spot(b.caption, open, ring)}
      {b.damaged ? <Damage x={x + map.wall.rx - 10} y={y} h={20} /> : null}
      {b.work ? (
        <text x={x - map.wall.rx + 20} y={y - map.wall.ry + 40} className="map-work">
          Palisade {workWords(b.level, b.work.level, b.work.daysLeft)}
        </text>
      ) : null}
    </>
  );
}

function Gate({
  b,
  x,
  y,
  spot,
  open,
}: {
  b: MapBuilding;
  x: number;
  y: number;
  spot: Spot;
  open: () => void;
}) {
  return spot(
    b.caption,
    open,
    <g>
      {b.art.sprite && SPRITES[b.art.sprite.sheet] ? (
        <Look art={b.art} x={x} y={y + 14} level={b.level || b.work!.level} ghost={!b.level} />
      ) : b.level ? (
        <>
          <rect
            x={x - 20}
            y={y - 9}
            width={40}
            height={18}
            fill={b.level >= 2 ? "#585a60" : "#7c5a34"}
            stroke="#120f0b"
          />
          <rect x={x - 26} y={y - 17} width={8} height={28} fill="#4c4230" />
          <rect x={x + 18} y={y - 17} width={8} height={28} fill="#4c4230" />
        </>
      ) : (
        <rect
          x={x - 20}
          y={y - 9}
          width={40}
          height={18}
          fill="none"
          stroke="#a89c88"
          strokeDasharray="3 3"
        />
      )}
      {b.work ? <Scaffold x={x} y={y + 9} w={46} h={22} /> : null}
      {b.damaged ? <Damage x={x} y={y + 9} h={22} /> : null}
      {b.work ? (
        <text x={x + 32} y={y + 4} className="map-work">
          Gate {workWords(b.level, b.work.level, b.work.daysLeft)}
        </text>
      ) : null}
    </g>,
  );
}

/** One tower on the wall per Watchtower level: east, west, then north. */
function Towers({
  b,
  map,
  spot,
  open,
}: {
  b: MapBuilding;
  map: typeof ix.lib.townMap;
  spot: Spot;
  open: () => void;
}) {
  const { x, y } = map.pit;
  const places = [
    [x + map.wall.rx, y],
    [x - map.wall.rx, y],
    [x, y - map.wall.ry],
  ] as const;
  const going = b.work ? b.work.level : 0;
  const count = Math.max(b.level, going);
  const pictured = !!(b.art.sprite && SPRITES[b.art.sprite.sheet]);
  return (
    <>
      {places.slice(0, Math.min(count, places.length)).map(([tx, ty], i) =>
        spot(
          b.caption,
          open,
          <g opacity={i < b.level ? 1 : 0.4}>
            {pictured ? (
              <Look art={b.art} x={tx} y={ty + 8} level={1} />
            ) : (
              <>
                <rect
                  x={tx - 6}
                  y={ty - 40}
                  width={12}
                  height={40}
                  fill="#6b543a"
                  stroke="#120f0b"
                />
                <rect
                  x={tx - 10}
                  y={ty - 48}
                  width={20}
                  height={9}
                  fill="#7c5a34"
                  stroke="#120f0b"
                />
                <path
                  d={`M${tx - 11} ${ty - 48}L${tx} ${ty - 58}L${tx + 11} ${ty - 48}z`}
                  fill={b.art.roof ?? "#8c3b2c"}
                />
              </>
            )}
            {i >= b.level ? <Scaffold x={tx} y={ty} w={18} h={50} /> : null}
            {b.damaged && i === 0 ? <Damage x={tx} y={ty} h={50} /> : null}
          </g>,
          `tower${i}`,
        ),
      )}
    </>
  );
}

/** The mining camp (the opening, DESIGN.md §8): tents, piles and a barricade round the pit. */
function Camp({
  scene,
  px,
  py,
  pry,
}: {
  scene: ReturnType<typeof townScene>;
  px: number;
  py: number;
  pry: number;
}) {
  const tents = [
    [px - 120, py - 80],
    [px + 130, py - 70],
    [px + 110, py + 90],
    [px - 130, py + 80],
  ];
  const logs = Math.min(scene.timber, 9);
  const stones = Math.min(scene.ore, 9);
  return (
    <g aria-hidden="true">
      {tents.map(([x, y], i) => (
        <g key={i}>
          <path
            d={`M${x! - 16} ${y}L${x} ${y! - 20}L${x! + 16} ${y}z`}
            fill="#8a7a5a"
            stroke="#120f0b"
          />
          <path d={`M${x} ${y! - 20}L${x! - 3} ${y}`} stroke="#4a4030" />
        </g>
      ))}
      {Array.from({ length: logs }, (_, i) => (
        <rect
          key={i}
          x={px - 200 + (i % 3) * 7}
          y={py - 10 - Math.floor(i / 3) * 5}
          width={26}
          height={5}
          rx={2}
          fill="#7c5a34"
        />
      ))}
      {logs ? (
        <text x={px - 188} y={py + 10} textAnchor="middle" className="map-label">
          timber {scene.timber}
        </text>
      ) : null}
      {Array.from({ length: stones }, (_, i) => (
        <circle
          key={i}
          cx={px + 190 + (i % 3) * 7}
          cy={py - Math.floor(i / 3) * 6}
          r={4}
          fill="#6c6a74"
        />
      ))}
      {stones ? (
        <text x={px + 198} y={py + 16} textAnchor="middle" className="map-label">
          ore {scene.ore}
        </text>
      ) : null}
      <path
        d={`M${px - 70} ${py + pry - 4} ${Array.from({ length: 7 }, (_, i) => `l10 ${i % 2 ? 14 : -14}`).join(" ")}`}
        stroke="#8a6a3a"
        strokeWidth={3}
        fill="none"
      />
    </g>
  );
}
