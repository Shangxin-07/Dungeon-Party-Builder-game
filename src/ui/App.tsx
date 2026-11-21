import { useState } from "react";
import { CrashGuard } from "./Crash";
import { ExpeditionView } from "./Expedition";
import { TestFight } from "./TestFight";
import { TownGame } from "./town";
import { BUILD_COMMIT, GAME_VERSION } from "../version";

type Tab = "town" | "sandbox";

export function App() {
  const [tab, setTab] = useState<Tab>("town");
  return (
    <main className="page">
      <header>
        <p className="eyebrow">
          Work in progress{" "}
          <span className="version" title={`Build ${BUILD_COMMIT}`}>
            ({GAME_VERSION})
          </span>
        </p>
        <h1>Dungeon Party Builder</h1>
        <p className="lede">
          Recruit a party, gear them up, and send them into the dungeon. Once they leave town,
          they're on their own. You can only watch.
        </p>
        <nav className="tabs" aria-label="Sections">
          <button
            type="button"
            className={tab === "town" ? "on" : ""}
            aria-current={tab === "town" ? "page" : undefined}
            onClick={() => setTab("town")}
          >
            Town
          </button>
          <button
            type="button"
            className={tab === "sandbox" ? "on" : ""}
            aria-current={tab === "sandbox" ? "page" : undefined}
            onClick={() => setTab("sandbox")}
          >
            Sandbox
          </button>
        </nav>
      </header>

      {tab === "town" ? (
        <CrashGuard>
          <TownGame />
        </CrashGuard>
      ) : (
        <>
          <p className="muted">
            Test runs with a fresh party and any seed. Nothing here touches your town.
          </p>
          <ExpeditionView />
          <TestFight />
        </>
      )}

      <footer>
        <p>
          New: floors 4 and 5 (the Flooded Shafts and the Old Delve) with ghouls, cave trolls,
          sporecallers and the Lost Delvers; glowcap and deep silver to dig up; and the Apothecary,
          the Mine Cage and a silver forge at the Blacksmith.
        </p>
      </footer>
    </main>
  );
}
