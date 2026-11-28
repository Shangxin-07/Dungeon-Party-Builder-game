/**
 * A building's picture on its card (M8.11): the same sprite the town map
 * draws, at the level about to be built, so the player sees what their gold
 * buys. The palisade is drawn round the pit on the map, so its card has a
 * picture of its own (`art.card`, M9.08). Buildings without either show
 * nothing here.
 */
import { Fragment } from "react";
import type { BuildingDef } from "../../content/types";
import { SPRITES, spriteFrame } from "./map/sprites";

/** The card's picture: its own art if it has some, else the map sprite. */
function cardArt(b: BuildingDef) {
  return b.art?.card ?? b.art?.sprite;
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
  if (!sprite || !sheet) return null;
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
  if (!sprite || !SPRITES[sprite.sheet]) return null;
  const looks = (n: number) => spriteFrame(sprite.frames, n);
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
