import { useState } from "react";
import { CrashGuard } from "./Crash";
import { ExpeditionView } from "./Expedition";
import { TestFight } from "./TestFight";
import { TownGame } from "./Town";
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
          New: used potions and bandages need restocking, and heroes get tired and injured, so it
          pays to rotate the party. Next up: more monsters, floors and buildings.
        </p>
      </footer>
    </main>
  );
}
