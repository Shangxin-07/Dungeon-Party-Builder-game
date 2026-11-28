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
    <main className={`page${tab === "town" ? " page-town" : ""}`}>
      <header className="masthead">
        <h1>Dungeon Party Builder</h1>
        <span className="eyebrow">
          Work in progress{" "}
          <span className="version" title={`Build ${BUILD_COMMIT}`}>
            ({GAME_VERSION})
          </span>
        </span>
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
        {/* What the game is, out of the way until asked for (M9.00). */}
        <details className="about">
          <summary>About</summary>
          <div className="about-body">
            <p className="lede">
              Recruit a party, gear them up, and send them into the dungeon. Once they leave town,
              they're on their own: you'll hear how it went when they're back.
            </p>
            <p className="small muted">
              The guild and its parties are on the left, the market, buildings and workshops on the
              right, and the town, the pit and the debriefs in the middle, with the news above and
              the townsfolk below. On a phone each of them is a tab.
            </p>
          </div>
        </details>
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
    </main>
  );
}
