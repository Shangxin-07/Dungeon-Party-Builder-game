import { useState } from "react";
import { CrashGuard } from "./Crash";
import { ExpeditionView } from "./Expedition";
import { TestFight } from "./TestFight";
import { TownGame } from "./town";
import { ConfirmHost } from "./Confirm";
import { BUILD_COMMIT, GAME_VERSION } from "../version";
import { MenuBurger, MenuRoot } from "./Menu";
import { restartTutorial } from "./tutorial/progress";

type Tab = "town" | "sandbox";

export function App() {
  const [tab, setTab] = useState<Tab>("town");
  return (
    <MenuRoot>
      <main className={`page${tab === "town" ? " page-town" : ""}`}>
        <header className="masthead">
          {/* M9.23: saving, loading, settings and About live behind the burger. */}
          <MenuBurger inTown={tab === "town"} onTown={() => setTab("town")} />
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
          <button
            type="button"
            className="tut-restart"
            title="Start the tutorial again from the top"
            onClick={() => {
              setTab("town");
              restartTutorial();
            }}
          >
            Tutorial
          </button>
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
        <ConfirmHost />
      </main>
    </MenuRoot>
  );
}
