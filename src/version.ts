// The version shown at the top of the page. Bump it by hand with each merged PR:
// M<milestone>.<part>, e.g. M6.05 -> M6.06, or M7.01 when a new milestone starts.
export const GAME_VERSION = "M6.09";

// Short commit hash, filled in by Vite at build time (see vite.config.ts).
declare const __BUILD_COMMIT__: string | undefined;
export const BUILD_COMMIT: string =
  typeof __BUILD_COMMIT__ === "string" && __BUILD_COMMIT__ ? __BUILD_COMMIT__ : "dev";
