/**
 * The game menu (M9.23): a burger by the game's name, holding saving,
 * loading, settings and About. The save slots belong to the town being
 * played, so the town fills those two sections in itself (<MenuSaves />,
 * through a portal); outside the town they say where to find them.
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { askConfirm } from "./Confirm";
import { BUILD_COMMIT, GAME_VERSION } from "../version";
import {
  PAGE_WIDTHS,
  pageWidth,
  setPageWidth,
  type PageWidth,
  idleWarnOn,
  resetLayout,
  setIdleWarn,
  setWatchSpeed,
  SPEEDS,
  watchSpeed,
  type Speed,
} from "./settings";
import { restartTutorial } from "./tutorial/progress";

export const MENU_SECTIONS = [
  { id: "save", name: "Save" },
  { id: "load", name: "Load" },
  { id: "config", name: "Config" },
  { id: "video", name: "Video" },
  { id: "sound", name: "Sound" },
  { id: "about", name: "About" },
] as const;
export type MenuSection = (typeof MENU_SECTIONS)[number]["id"];

type MenuCtx = {
  section?: MenuSection;
  setSection: (s: MenuSection | undefined) => void;
  /** Where the town draws the save sections, while one is open. */
  host: HTMLElement | null;
  setHost: (el: HTMLElement | null) => void;
  close: () => void;
};
const Ctx = createContext<MenuCtx>({
  setSection: () => {},
  host: null,
  setHost: () => {},
  close: () => {},
});

/** Holds the menu's state, round the whole page, so the town can reach it. */
export function MenuRoot({ children }: { children: ReactNode }) {
  const [section, setSection] = useState<MenuSection>();
  const [host, setHost] = useState<HTMLElement | null>(null);
  const close = () => setSection(undefined);
  useEffect(() => {
    if (!section) return;
    const key = (e: KeyboardEvent) => {
      // An open "are you sure?" takes the Escape for itself.
      if (e.key === "Escape" && !document.querySelector(".confirm-backdrop")) close();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [section]);
  const isSaves = section === "save" || section === "load";
  return (
    <Ctx.Provider value={{ section, setSection, host: isSaves ? host : null, setHost, close }}>
      {children}
    </Ctx.Provider>
  );
}

/** The burger button and, while it's open, the menu. */
export function MenuBurger({
  onTown,
  inTown,
}: {
  /** Go to the town (from the sandbox, say). */
  onTown: () => void;
  inTown: boolean;
}) {
  const { section, setSection, setHost, close } = useContext(Ctx);
  const isSaves = section === "save" || section === "load";
  return (
    <>
      <button
        type="button"
        className={`menu-burger${section ? " on" : ""}`}
        aria-label="Menu"
        aria-expanded={!!section}
        title="Menu: save, load, settings and about"
        onClick={() => setSection(section ? undefined : "save")}
      >
        <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true">
          <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="2" />
        </svg>
      </button>
      {section ? (
        <>
          <div className="menu-backdrop" onClick={close} />
          <div className="menu-panel" role="dialog" aria-label="Menu">
            <nav className="menu-list" aria-label="Menu sections">
              {MENU_SECTIONS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={section === s.id ? "on" : ""}
                  aria-current={section === s.id ? "page" : undefined}
                  onClick={() => setSection(s.id)}
                >
                  {s.name}
                </button>
              ))}
            </nav>
            <div className="menu-body">
              <button type="button" className="menu-close" aria-label="Close" onClick={close}>
                ×
              </button>
              <h2>{MENU_SECTIONS.find((s) => s.id === section)!.name}</h2>
              {isSaves ? (
                <>
                  <div className="menu-host" ref={setHost} />
                  <p className="menu-fallback muted">
                    Your guild's saves are kept with the town.{" "}
                    {inTown ? null : (
                      <button type="button" className="btn" onClick={onTown}>
                        Go to the town
                      </button>
                    )}
                  </p>
                </>
              ) : null}
              {section === "config" ? (
                <ConfigSection
                  onTutorial={() => {
                    onTown();
                    close();
                    restartTutorial();
                  }}
                />
              ) : null}
              {section === "video" ? <VideoSection /> : null}
              {section === "sound" ? (
                <p className="muted">
                  The game has no sound yet. When it does, the volume and the music go here.
                </p>
              ) : null}
              {section === "about" ? <AboutSection /> : null}
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}

/**
 * The town's way into the Save and Load sections: renders `render(mode)`
 * there while one of them is open, and nothing otherwise.
 */
export function MenuSaves({
  render,
}: {
  render: (mode: "save" | "load", close: () => void) => ReactNode;
}) {
  const { section, host, close } = useContext(Ctx);
  if (!host || (section !== "save" && section !== "load")) return null;
  return createPortal(render(section, close), host);
}

function ConfigSection({ onTutorial }: { onTutorial: () => void }) {
  const [warn, setWarn] = useState(idleWarnOn);
  return (
    <>
      <label className="menu-row">
        <input
          type="checkbox"
          checked={warn}
          onChange={(e) => {
            setWarn(e.target.checked);
            setIdleWarn(e.target.checked);
          }}
        />{" "}
        Ask before a second Next day with nothing done in between
      </label>
      <p className="menu-row">
        <button type="button" className="btn" onClick={onTutorial}>
          Start the tutorial again
        </button>
      </p>
      <p className="menu-row">
        <button
          type="button"
          className="btn"
          onClick={async () => {
            if (
              await askConfirm({
                message:
                  "Close every panel and go back to the first tab of each pane? Your guild isn't touched.",
                ok: "Reset the layout",
              })
            ) {
              resetLayout();
              location.reload();
            }
          }}
        >
          Reset the screen layout
        </button>{" "}
        <span className="muted small">Forgets which panels and tabs were left open.</span>
      </p>
      <p className="muted small">
        Settings are kept in this browser, not in your saves, so each computer has its own.
      </p>
    </>
  );
}

function VideoSection() {
  const [speed, setSpeed] = useState<Speed>(watchSpeed);
  const [width, setWidth] = useState<PageWidth>(pageWidth);
  return (
    <>
      <fieldset className="menu-row menu-choice">
        <legend>Page width</legend>
        {(Object.keys(PAGE_WIDTHS) as PageWidth[]).map((w) => (
          <label key={w}>
            <input
              type="radio"
              name="page-width"
              checked={width === w}
              onChange={() => {
                setWidth(w);
                setPageWidth(w);
              }}
            />{" "}
            {PAGE_WIDTHS[w]}
          </label>
        ))}
        <span className="muted small">
          On a very wide screen the whole window lets the guild, the centre and the buildings spread
          out instead of leaving empty space at the sides.
        </span>
      </fieldset>
      <label className="menu-row">
        Trips and raids play back at{" "}
        <select
          value={speed}
          onChange={(e) => {
            const s = e.target.value as Speed;
            setSpeed(s);
            setWatchSpeed(s);
          }}
        >
          {Object.keys(SPEEDS).map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>{" "}
        speed
      </label>
      <p className="muted small">Changing the speed while watching changes it here too.</p>
    </>
  );
}

function AboutSection() {
  return (
    <>
      <p className="lede">
        Recruit a party, gear them up, and send them into the dungeon. Once they leave town, they're
        on their own: you'll hear how it went when they're back.
      </p>
      <p className="small muted">
        The guild and its parties are on the left, the market, buildings and workshops on the right,
        and the town, the pit and the debriefs in the middle, with the news above and the townsfolk
        below. On a phone each of them is a tab.
      </p>
      <p className="small">
        Version <strong>{GAME_VERSION}</strong> (work in progress), build{" "}
        <code>{BUILD_COMMIT}</code>.
      </p>
    </>
  );
}
