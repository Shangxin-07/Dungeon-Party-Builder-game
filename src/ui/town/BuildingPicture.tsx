/**
 * A building's picture on its card (M8.11): the same sprite the town map
 * draws, at the level about to be built, so the player sees what their gold
 * buys. The palisade is drawn round the pit on the map, so its card has a
 * picture of its own (`art.card`), with a drawn stand-in until that sheet
 * arrives (M9.08). Other buildings without a sprite show nothing here.
 */
import { Fragment, type ReactElement } from "react";
import type { BuildingDef } from "../../content/types";
import { SPRITES, spriteFrame } from "./map/sprites";

/** The card's picture: its own art if it has some, else the map sprite. */
function cardArt(b: BuildingDef) {
  return b.art?.card ?? b.art?.sprite;
}

/** Whether the card draws a stand-in: a wall whose picture hasn't come in yet. */
function sketched(b: BuildingDef): boolean {
  const art = cardArt(b);
  return b.art?.shape === "wall" && !(art && SPRITES[art.sheet]);
}

/**
 * A stretch of the palisade at `level`, drawn until Mike's sheet comes in:
 * sharpened stakes, then a stone wall, then a high wall with a walk on top.
 */
function WallSketch({ level }: { level: number }) {
  const ground = 92;
  const shapes: ReactElement[] = [];
  if (level <= 1) {
    for (let x = 10; x < 118; x += 12) {
      const h = 46 + ((x * 7) % 9);
      shapes.push(
        <polygon
          key={x}
          points={`${x},${ground} ${x},${ground - h} ${x + 5},${ground - h - 8} ${x + 10},${ground - h} ${x + 10},${ground}`}
          fill="#6b4a2e"
          stroke="#3a281a"
        />,
      );
    }
    shapes.push(<rect key="band" x={8} y={ground - 22} width={112} height={4} fill="#4a3424" />);
  } else {
    const high = level >= 3;
    const top = ground - (high ? 64 : 40);
    shapes.push(
      <rect
        key="wall"
        x={8}
        y={top}
        width={112}
        height={ground - top}
        fill="#77736b"
        stroke="#3d3a36"
      />,
    );
    for (let y = top + 8, row = 0; y < ground; y += 8, row++)
      for (let x = 8 + (row % 2 ? 7 : 0); x < 120; x += 14)
        shapes.push(<line key={`${x}-${y}`} x1={x} y1={y} x2={x} y2={y + 8} stroke="#4f4c47" />);
    for (let y = top + 8; y < ground; y += 8)
      shapes.push(<line key={`r${y}`} x1={8} y1={y} x2={120} y2={y} stroke="#4f4c47" />);
    for (let x = 8; x < 120; x += 16)
      shapes.push(
        <rect
          key={`c${x}`}
          x={x}
          y={top - 8}
          width={9}
          height={8}
          fill="#77736b"
          stroke="#3d3a36"
        />,
      );
    if (high)
      shapes.push(<rect key="torch" x={60} y={top - 18} width={4} height={10} fill="#e0a040" />);
  }
  return (
    <svg
      viewBox="0 0 128 100"
      preserveAspectRatio="xMidYMax meet"
      role="img"
      aria-label={`Palisade, level ${level}`}
    >
      <rect x={0} y={ground} width={128} height={4} fill="#3b3026" />
      {shapes}
    </svg>
  );
}

/** One frame of a building's sprite sheet, fitted to the box and stood on its bottom edge. */
function Frame({
  building,
  level,
  label,
  className = "",
}: {
  building: BuildingDef;
  level: number;
  label?: string;
  className?: string;
}) {
  const sprite = cardArt(building);
  const sheet = sprite && SPRITES[sprite.sheet];
  if (!sprite || !sheet) {
    if (!sketched(building)) return null;
    return (
      <figure className={`building-frame ${className}`}>
        <WallSketch level={level} />
        {label ? <figcaption className="small muted">{label}</figcaption> : null}
      </figure>
    );
  }
  const frame = spriteFrame(sprite.frames, level);
  return (
    <figure className={`building-frame ${className}`}>
      <svg
        viewBox={`0 0 ${sheet.frameWidth} ${sheet.frameHeight}`}
        preserveAspectRatio="xMidYMax meet"
        role="img"
        aria-label={`${building.name}${label ? `, ${label.toLowerCase()}` : ""}`}
      >
        {/* The inner viewport clips the sheet to one frame, so its neighbours don't show. */}
        <svg
          width={sheet.frameWidth}
          height={sheet.frameHeight}
          viewBox={`${frame * sheet.frameWidth} 0 ${sheet.frameWidth} ${sheet.frameHeight}`}
          overflow="hidden"
        >
          <image
            href={sheet.url}
            width={sheet.frameWidth * sheet.count}
            height={sheet.frameHeight}
            preserveAspectRatio="none"
          />
        </svg>
      </svg>
      {label ? <figcaption className="small muted">{label}</figcaption> : null}
    </figure>
  );
}

/**
 * The picture for a building card. Not built: what level 1 looks like.
 * Built, with an upgrade that changes the look: now and next side by side.
 * Going up: the level being built, faded until it's done. Damaged: darkened.
 */
export function BuildingPicture({
  building: b,
  level,
  next,
  going,
  damaged,
}: {
  building: BuildingDef;
  level: number;
  /** The level an upgrade would build, if there is one. */
  next?: number;
  /** The level builders are working on, if any. */
  going?: number;
  damaged?: boolean;
}) {
  const sprite = cardArt(b);
  const drawn = sketched(b);
  if (!drawn && (!sprite || !SPRITES[sprite.sheet])) return null;
  const looks = (n: number) => (sprite ? spriteFrame(sprite.frames, n) : n);
  let frames: { level: number; label?: string; className?: string }[];
  if (going)
    frames =
      level && looks(level) !== looks(going)
        ? [
            { level, label: "Now" },
            { level: going, label: `Level ${going}, going up`, className: "going" },
          ]
        : [
            {
              level: going,
              label: level ? undefined : "Going up",
              className: level ? "" : "going",
            },
          ];
  else if (!level) frames = [{ level: 1, className: "unbuilt" }];
  else if (next && !damaged && looks(level) !== looks(next))
    frames = [
      { level, label: "Now" },
      { level: next, label: `Level ${next}` },
    ];
  else frames = [{ level, className: damaged ? "damaged" : "" }];
  return (
    <div className={`building-picture${frames.length > 1 ? " two" : ""}`}>
      {frames.map((f, i) => (
        <Fragment key={i}>
          {i ? (
            <span className="building-arrow" aria-hidden="true">
              →
            </span>
          ) : null}
          <Frame building={b} level={f.level} label={f.label} className={f.className} />
        </Fragment>
      ))}
    </div>
  );
}
