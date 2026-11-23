/**
 * Picture art for the town map (M8, DESIGN.md §19): sprite sheets that replace
 * a building's drawn shape. A sheet is one PNG of equal frames side by side,
 * each bottom-centred on the same ground line. Make one from a generated
 * picture with `python3 scripts/cut-sprite.py`, which prints the numbers below.
 * Content picks a sheet and a frame per level (`art.sprite` on a building).
 */
import tavern from "./sprites/tavern.png";

export interface SpriteSheet {
  url: string;
  /** Size of one frame in the PNG, in pixels. */
  frameWidth: number;
  frameHeight: number;
  count: number;
}

export const SPRITES: Record<string, SpriteSheet> = {
  // Mike's tavern (DPBG-0001-Inn), 2026-11-23.
  tavern: { url: tavern, frameWidth: 297, frameHeight: 248, count: 3 },
};

/** The frame of `sheet` for a building at `level` (1+): levels past the list use the last. */
export function spriteFrame(frames: readonly number[], level: number): number {
  return frames[Math.min(Math.max(level, 1), frames.length) - 1] ?? 0;
}
