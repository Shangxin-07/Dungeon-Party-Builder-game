/**
 * Picture art for the town map (M8, DESIGN.md §19): sprite sheets that replace
 * a building's drawn shape. A sheet is one PNG of equal frames side by side,
 * each bottom-centred on the same ground line. Make one from a generated
 * picture with `python3 scripts/cut-sprite.py`, which prints the numbers below.
 * Content picks a sheet and a frame per level (`art.sprite` on a building).
 */
import tavern from "./sprites/tavern.png";
import guildHall from "./sprites/guild-hall.png";
import market from "./sprites/market.png";
import blacksmith from "./sprites/blacksmith.png";
import apothecary from "./sprites/apothecary.png";
import trainingYard from "./sprites/training-yard.png";
import library from "./sprites/library.png";
import temple from "./sprites/temple.png";
import vault from "./sprites/vault.png";
import blackMarket from "./sprites/black-market.png";
import graveyard from "./sprites/graveyard.png";
import sawmill from "./sprites/sawmill.png";
import farm from "./sprites/farm.png";
import cottages from "./sprites/cottages.png";
import gate from "./sprites/gate.png";
import watchtower from "./sprites/watchtower.png";
import mineCage from "./sprites/mine-cage.png";

export interface SpriteSheet {
  url: string;
  /** Size of one frame in the PNG, in pixels. */
  frameWidth: number;
  frameHeight: number;
  count: number;
  /** How wide one frame is drawn on the town map, in map units. */
  width: number;
}

export const SPRITES: Record<string, SpriteSheet> = {
  // Mike's pixel art, 2026-11-23 (originals in the project files, art/DPBG-*.png).
  tavern: { url: tavern, frameWidth: 260, frameHeight: 217, count: 3, width: 124 }, // DPBG-0001-Inn
  "guild-hall": { url: guildHall, frameWidth: 260, frameHeight: 325, count: 5, width: 124 }, // DPBG-0002-GuildHall
  market: { url: market, frameWidth: 260, frameHeight: 242, count: 1, width: 108 }, // DPBG-0003-Marketplace
  blacksmith: { url: blacksmith, frameWidth: 260, frameHeight: 212, count: 3, width: 120 }, // DPBG-0004-Blacksmith
  apothecary: { url: apothecary, frameWidth: 260, frameHeight: 216, count: 2, width: 110 }, // DPBG-0005-Apothecary
  "training-yard": { url: trainingYard, frameWidth: 260, frameHeight: 192, count: 2, width: 120 }, // DPBG-0006-TrainingYard
  library: { url: library, frameWidth: 260, frameHeight: 254, count: 2, width: 100 }, // DPBG-0007-Library
  temple: { url: temple, frameWidth: 260, frameHeight: 196, count: 2, width: 116 }, // DPBG-0008-Temple
  vault: { url: vault, frameWidth: 260, frameHeight: 205, count: 2, width: 98 }, // DPBG-0009-Vault
  "black-market": { url: blackMarket, frameWidth: 260, frameHeight: 250, count: 1, width: 90 }, // DPBG-0010-BlackMarketplace
  graveyard: { url: graveyard, frameWidth: 260, frameHeight: 221, count: 1, width: 100 }, // DPBG-0011-Graveyard
  sawmill: { url: sawmill, frameWidth: 260, frameHeight: 201, count: 2, width: 110 }, // DPBG-0012-Sawmill
  farm: { url: farm, frameWidth: 260, frameHeight: 177, count: 3, width: 140 }, // DPBG-0013-Farm
  cottages: { url: cottages, frameWidth: 260, frameHeight: 178, count: 3, width: 128 }, // DPBG-0014-Cottages
  gate: { url: gate, frameWidth: 260, frameHeight: 222, count: 2, width: 74 }, // DPBG-0015-PitGate
  watchtower: { url: watchtower, frameWidth: 110, frameHeight: 257, count: 1, width: 32 }, // DPBG-0016-WatchTower
  "mine-cage": { url: mineCage, frameWidth: 260, frameHeight: 233, count: 2, width: 118 }, // DPBG-0017-MineCage
};

/** The frame of `sheet` for a building at `level` (1+): levels past the list use the last. */
export function spriteFrame(frames: readonly number[], level: number): number {
  return frames[Math.min(Math.max(level, 1), frames.length) - 1] ?? 0;
}
