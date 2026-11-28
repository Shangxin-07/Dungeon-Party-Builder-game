/**
 * The player's own settings (M9.23), kept in this browser only and never in
 * the save, like the other dpb-ui-* keys. The menu (src/ui/Menu.tsx) shows
 * them; the parts of the game they change read them here.
 */

const IDLE_WARN_KEY = "dpb-ui-idle-warn";
const SPEED_KEY = "dpb-ui-watch-speed";

/** Every key that only remembers where the screen was left (open panels, tabs). */
const LAYOUT_KEYS = [
  "dpb-ui-open",
  "dpb-ui-pane-open",
  "dpb-ui-tab",
  "dpb-ui-centre",
  "dpb-ui-build-tab",
  "dpb-ui-hero-tab",
];

function get(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function set(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Private windows: the choice just isn't remembered.
  }
}

/** Whether to ask before a second Next day with nothing done in between (M9.13). */
export const idleWarnOn = (): boolean => get(IDLE_WARN_KEY) !== "off";

export const setIdleWarn = (on: boolean) => set(IDLE_WARN_KEY, on ? null : "off");

/** How fast trips and raids play back, in ms per line. */
export const SPEEDS = { slow: 450, normal: 200, fast: 40 } as const;
export type Speed = keyof typeof SPEEDS;

/** The playback speed a trip or raid starts at. */
export function watchSpeed(): Speed {
  const s = get(SPEED_KEY);
  return s && s in SPEEDS ? (s as Speed) : "normal";
}

export const setWatchSpeed = (s: Speed) => set(SPEED_KEY, s === "normal" ? null : s);

/** Forget which panels and tabs were open; the page reloads to show it. */
export function resetLayout() {
  for (const k of LAYOUT_KEYS) set(k, null);
}
