/**
 * The save slots panel: switch, export, import and clear saves.
 */
import type { TownState } from "../../sim/town";
import { importSave } from "../../sim/save";
import { ix } from "../game";
import { clearSlot, downloadSave, downloadRaw, inspectSlot, type SlotState, SLOTS } from "../saves";
import { freshTown } from "./TownGame";

export function Saves({
  slot,
  town,
  onSwitch,
  onError,
}: {
  slot: number;
  town: TownState;
  onSwitch: (slot: number, town: TownState) => void;
  onError: (message: string) => void;
}) {
  // Re-read the other slots whenever the town changes, so "saved at" stays fresh.
  const slots = SLOTS.map((n) => {
    const s: SlotState | undefined = n === slot ? undefined : inspectSlot(n);
    return { n, s, info: s?.state === "ok" ? s : undefined };
  });
  return (
    <section aria-labelledby="saves-heading" className="panel">
      <h2 id="saves-heading">Saves</h2>
      <p className="muted small">
        Your guild saves itself in this browser after everything you do. Keep up to {SLOTS.length}{" "}
        guilds going in separate slots, or save one to a file to keep it safe or move it to another
        computer.
      </p>
      <ul className="slots">
        {slots.map(({ n, s, info }) => {
          const t = n === slot ? town : info?.town;
          if (s?.state === "unreadable")
            return (
              <li key={n} className="slot">
                <strong>Slot {n}</strong>{" "}
                <span className="muted small">Can't be loaded: {s.reason}</span>
                <span className="slot-actions">
                  <button type="button" className="btn" onClick={() => downloadRaw(n, s.raw)}>
                    Download it
                  </button>
                  <button
                    type="button"
                    className="link danger"
                    onClick={() => {
                      if (!confirm(`Delete the save in slot ${n}? It will be gone for good.`))
                        return;
                      clearSlot(n);
                      onError("");
                    }}
                  >
                    Delete
                  </button>
                </span>
              </li>
            );
          return (
            <li key={n} className={`slot${n === slot ? " playing" : ""}`}>
              <strong>Slot {n}</strong>{" "}
              {t ? (
                <span className="muted small">
                  Day {t.day}, {t.gold} gold, {t.roster.length} heroes
                  {t.memorial.length ? `, ${t.memorial.length} fallen` : ""}
                  {info ? `. Saved ${info.savedAt.toLocaleString()}` : ""}
                </span>
              ) : (
                <span className="muted small">Empty</span>
              )}
              <span className="slot-actions">
                {n === slot ? (
                  <span className="small">Playing</span>
                ) : (
                  <button
                    type="button"
                    className="btn"
                    onClick={() => onSwitch(n, info?.town ?? freshTown())}
                  >
                    {info ? "Play" : "Start a guild here"}
                  </button>
                )}
                {t ? (
                  <button
                    type="button"
                    className="link danger"
                    onClick={() => {
                      const what = n === slot ? "your current guild" : `the guild in slot ${n}`;
                      if (!confirm(`Start over in slot ${n}? ${what} will be gone.`)) return;
                      if (n === slot) onSwitch(n, freshTown());
                      else clearSlot(n);
                      onError("");
                    }}
                  >
                    {n === slot ? "Start over" : "Delete"}
                  </button>
                ) : null}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="small">
        <button type="button" className="btn" onClick={() => downloadSave(town)}>
          Save to a file
        </button>{" "}
        <label className="btn file-btn">
          Load from a file…
          <input
            type="file"
            accept="application/json,.json"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              try {
                const loaded = importSave(ix, await file.text());
                if (
                  confirm(
                    `Load this guild (day ${loaded.day}) into slot ${slot}? The one there now will be replaced.`,
                  )
                )
                  onSwitch(slot, loaded);
              } catch (err) {
                onError((err as Error).message);
              }
            }}
          />
        </label>
      </p>
    </section>
  );
}
