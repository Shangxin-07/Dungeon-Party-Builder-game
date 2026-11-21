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

/**
 * What's in a slot. A slot that holds something the game can't read
 * ("unreadable") is never treated as empty: the player decides what happens
 * to it, so a save from a newer version (an old tab still open after an
 * update) or one a future change breaks is never played over by accident.
 */
export type SlotState =
  | { state: "empty" }
  | ({ state: "ok" } & SlotInfo)
  | { state: "unreadable"; raw: string; reason: string };

export function inspectSlot(slot: number): SlotState {
  const raw = get(slotKey(slot));
  if (!raw) return { state: "empty" };
  try {
    const town = importSave(ix, raw);
    const savedAt = new Date((JSON.parse(raw) as { savedAt?: string }).savedAt ?? 0);
    return { state: "ok", town, savedAt };
  } catch (e) {
    return { state: "unreadable", raw, reason: (e as Error).message };
  }
}

export function readSlot(slot: number): SlotInfo | undefined {
  const s = inspectSlot(slot);
  return s.state === "ok" ? s : undefined;
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
  download(exportSave(town, new Date()), `dungeon-party-day-${town.day}.json`);
}

/** Offer a slot's save, exactly as stored, as a file download (for one the game can't read). */
export function downloadRaw(slot: number, raw: string): void {
  download(raw, `dungeon-party-slot-${slot}.json`);
}

function download(text: string, name: string): void {
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** The playing slot's save exactly as stored, if there is one (for the crash screen). */
export function activeRaw(): { slot: number; raw: string } | undefined {
  const slot = activeSlot();
  const raw = get(slotKey(slot));
  return raw ? { slot, raw } : undefined;
}
