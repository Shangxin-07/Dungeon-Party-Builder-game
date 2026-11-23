/**
 * Hero portraits (M8.06, DESIGN.md §19.5): a face stacked from Mike's layers
 * (head, hair, beard, a scar or two, class headgear, injuries), every choice
 * hashed from the hero's id and name, so a hero always looks the same and the
 * save never changes. Hair and beard share a colour; risen heroes keep their
 * face, gone pale and grey-green.
 */
import type { Hero } from "../../sim/hero";
import { mainClass } from "../../sim/levels";
import { ix } from "../game";
import beards from "./faces/beards.png";
import extras from "./faces/extras.png";
import hair from "./faces/hair.png";
import hats from "./faces/hats.png";
import heads from "./faces/heads.png";
import injuries from "./faces/injuries.png";

const LAYERS = { heads, hair, beards, extras, injuries, hats };
type Layer = keyof typeof LAYERS;
const ROWS: Record<Layer, number> = {
  heads: 2,
  hair: 2,
  beards: 2,
  extras: 2,
  injuries: 2,
  hats: 4,
};

/** Hair colours, as CSS filters over the mid-brown the parts are drawn in. */
export const HAIR = {
  brown: "none",
  black: "brightness(0.45) saturate(0.6)",
  blond: "sepia(0.5) saturate(1.6) brightness(1.45)",
  red: "hue-rotate(-18deg) saturate(1.9) brightness(1.05)",
  grey: "grayscale(1) brightness(1.35)",
} as const;

export interface Face {
  head: number;
  hair?: number;
  beard?: number;
  extra?: number;
  hat?: number;
  injury?: number;
  colour: keyof typeof HAIR;
  risen: boolean;
}

/** Who a portrait is of: a hero, or what the memorial remembers of one. */
export type Sitter = Pick<Hero, "id" | "name" | "classId"> &
  Partial<Pick<Hero, "classes" | "porter" | "injuries">>;

/** FNV-1a: a steady number from a string. */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Everything about a hero's face, worked out from who they are. Pure. */
export function faceOf(hero: Sitter, risen = false): Face {
  // Risen heroes are named "Bram, Risen": hash the name they were born with.
  const seed = `${hero.id}:${hero.name.replace(/, Risen$/, "")}`;
  const pick = (what: string, n: number) => hash(`${seed}:${what}`) % n;
  const head = pick("head", 8);
  const colours = Object.keys(HAIR) as (keyof typeof HAIR)[];
  // Older-looking heads (2) go grey more often.
  const colour = head === 2 && pick("grey", 2) ? "grey" : colours[pick("colour", colours.length)]!;
  const bald = pick("bald", 9) === 0;
  const bearded = pick("bearded", 2) === 0;
  const marked = pick("marked", 3) === 0;
  const face: Face = { head, colour, risen };
  if (!bald) face.hair = pick("hair", 8);
  if (bearded) face.beard = pick("beard", 8);
  if (marked) face.extra = pick("extra", 8);
  const cls = hero.porter
    ? undefined
    : ix.lib.classes.find((c) => c.id === (hero.classes ? mainClass(hero as Hero) : hero.classId));
  if (hero.porter) face.hat = 14;
  else if (cls?.hats?.length) face.hat = cls.hats[pick("hat", cls.hats.length)];
  if (hero.injuries?.length) face.injury = pick(`hurt:${hero.injuries[0]!.id}`, 8);
  return face;
}

function Part({
  layer,
  cell,
  size,
  filter,
}: {
  layer: Layer;
  cell: number;
  size: number;
  filter?: string;
}) {
  return (
    <span
      className="face-part"
      style={{
        backgroundImage: `url(${LAYERS[layer]})`,
        backgroundSize: `${4 * size}px ${ROWS[layer] * size}px`,
        backgroundPosition: `-${(cell % 4) * size}px -${Math.floor(cell / 4) * size}px`,
        filter: filter && filter !== "none" ? filter : undefined,
      }}
    />
  );
}

export function Portrait({
  hero,
  size = 48,
  risen = false,
  className = "",
}: {
  hero: Sitter;
  size?: number;
  risen?: boolean;
  className?: string;
}) {
  const f = faceOf(hero, risen || /, Risen$/.test(hero.name));
  const tint = HAIR[f.colour];
  return (
    <span
      className={`portrait${f.risen ? " risen" : ""} ${className}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${hero.name}'s portrait`}
    >
      <Part layer="heads" cell={f.head} size={size} />
      {f.extra !== undefined ? <Part layer="extras" cell={f.extra} size={size} /> : null}
      {f.beard !== undefined ? (
        <Part layer="beards" cell={f.beard} size={size} filter={tint} />
      ) : null}
      {f.hair !== undefined ? <Part layer="hair" cell={f.hair} size={size} filter={tint} /> : null}
      {f.injury !== undefined ? <Part layer="injuries" cell={f.injury} size={size} /> : null}
      {f.hat !== undefined ? <Part layer="hats" cell={f.hat} size={size} /> : null}
    </span>
  );
}
