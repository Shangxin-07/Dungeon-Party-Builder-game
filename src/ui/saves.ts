/**
 * Save slots in the browser (localStorage). Each slot holds one town as an
 * exported save file (src/sim/save.ts), so old saves are upgraded on load.
 * The town being played autosaves into its slot after every action.
 */
import { exportSave, importSave } from "../sim/save";
import type { TownState } from "../sim/town";
import { ix } from "./game";

export const SLOTS = [1, 2, 3] as const;
const slotKey = (slot: number) => `dpb-slot-${slot}`;
const ACTIVE_KEY = "dpb-active-slot";
/** Where M3 kept its single autosave. */
const LEGACY_KEY = "dpb-town";

export interface SlotInfo {
  town: TownState;
  savedAt: Date;
}

function get(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function set(key: string, value: string | null): boolean {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
    return true;
  } catch {
    // Private windows and full storage: the game still plays, it just won't remember.
    return false;
  }
}

export function readSlot(slot: number): SlotInfo | undefined {
  const raw = get(slotKey(slot));
  if (!raw) return undefined;
  try {
    const town = importSave(ix, raw);
    const savedAt = new Date((JSON.parse(raw) as { savedAt?: string }).savedAt ?? 0);
    return { town, savedAt };
  } catch {
    return undefined;
  }
}

export function writeSlot(slot: number, town: TownState): boolean {
  return set(slotKey(slot), exportSave(town, new Date()));
}

export function clearSlot(slot: number): void {
  set(slotKey(slot), null);
}

export function activeSlot(): number {
  const n = Number(get(ACTIVE_KEY));
  return (SLOTS as readonly number[]).includes(n) ? n : 1;
}

export function setActiveSlot(slot: number): void {
  set(ACTIVE_KEY, String(slot));
}

/** Move an M3 autosave into slot 1 (if slot 1 is free), upgrading it on the way. */
export function adoptLegacySave(): void {
  const raw = get(LEGACY_KEY);
  if (!raw) return;
  if (!get(slotKey(1))) {
    try {
      const wrapped = JSON.stringify({ game: "dungeon-party-builder", town: JSON.parse(raw) });
      writeSlot(1, importSave(ix, wrapped));
    } catch {
      return; // Unreadable: leave it where it is.
    }
  }
  set(LEGACY_KEY, null);
}

/** Offer the town as a file download. */
export function downloadSave(town: TownState): void {
  const blob = new Blob([exportSave(town, new Date())], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `dungeon-party-day-${town.day}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
