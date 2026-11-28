/**
 * The save slots, shown in the menu's Save and Load sections (M9.23; before
 * that a panel under Books). Save: copy this guild into another slot or to a
 * file. Load: play another slot, load a file, or clear a slot.
 */
import { useState } from "react";
import { askConfirm } from "../Confirm";
import type { TownState } from "../../sim/town";
import { importSave } from "../../sim/save";
import { ix } from "../game";
import {
  clearSlot,
  downloadSave,
  downloadRaw,
  inspectSlot,
  type SlotState,
  SLOTS,
  writeSlot,
} from "../saves";
import { freshTown } from "./TownGame";

const about = (t: TownState) =>
  `Day ${t.day}, ${t.gold} gold, ${t.roster.length} heroes` +
  (t.memorial.length ? `, ${t.memorial.length} fallen` : "");

export function Saves({
  mode,
  slot,
  town,
  onSwitch,
  onError,
}: {
  mode: "save" | "load";
  slot: number;
  town: TownState;
  onSwitch: (slot: number, town: TownState) => void;
  onError: (message: string) => void;
}) {
  // Bumped after writing or clearing a slot, so the list reads them again.
  const [, setTick] = useState(0);
  const reread = () => setTick((n) => n + 1);
  // Re-read the other slots on every render, so "saved at" stays fresh.
  const slots = SLOTS.map((n) => {
    const s: SlotState | undefined = n === slot ? undefined : inspectSlot(n);
    return { n, s, info: s?.state === "ok" ? s : undefined };
  });

  const deleteSlot = async (n: number, message: string) => {
    if (!(await askConfirm({ message, ok: "Delete", danger: true }))) return;
    clearSlot(n);
    onError("");
    reread();
  };

  return (
    <>
      <p className="muted small">
        {mode === "save"
          ? `Your guild saves itself in this browser after everything you do (you're playing slot ${slot}). Put a copy in another slot or in a file to keep it safe, or to move it to another computer.`
          : `Keep up to ${SLOTS.length} guilds going, one in each slot, or load one from a file.`}
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
                    onClick={() =>
                      deleteSlot(n, `Delete the save in slot ${n}? It will be gone for good.`)
                    }
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
                  {about(t)}
                  {info ? `. Saved ${info.savedAt.toLocaleString()}` : ""}
                </span>
              ) : (
                <span className="muted small">Empty</span>
              )}
              <span className="slot-actions">
                {n === slot ? <span className="small">Playing</span> : null}
                {n !== slot && mode === "save" ? (
                  <button
                    type="button"
                    className="btn"
                    onClick={async () => {
                      if (
                        t &&
                        !(await askConfirm({
                          message: `Put a copy of this guild in slot ${n}? The guild there now (${about(t).toLowerCase()}) will be gone.`,
                          ok: "Save over it",
                          danger: true,
                        }))
                      )
                        return;
                      if (!writeSlot(n, town))
                        onError("This browser wouldn't save it. Try saving to a file instead.");
                      reread();
                    }}
                  >
                    Save a copy here
                  </button>
                ) : null}
                {n !== slot && mode === "load" ? (
                  <button
                    type="button"
                    className="btn"
                    onClick={() => onSwitch(n, info?.town ?? freshTown())}
                  >
                    {info ? "Play" : "Start a guild here"}
                  </button>
                ) : null}
                {t && mode === "load" ? (
                  <button
                    type="button"
                    className="link danger"
                    onClick={async () => {
                      if (n !== slot)
                        return deleteSlot(
                          n,
                          `Delete the guild in slot ${n}? It will be gone for good.`,
                        );
                      if (
                        await askConfirm({
                          message: `Start over in slot ${n}? Your current guild will be gone.`,
                          ok: "Start over",
                          danger: true,
                        })
                      ) {
                        onSwitch(n, freshTown());
                        onError("");
                      }
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
        {mode === "save" ? (
          <button type="button" className="btn btn-main" onClick={() => downloadSave(town)}>
            Save to a file
          </button>
        ) : (
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
                    await askConfirm({
                      message: `Load this guild (day ${loaded.day}) into slot ${slot}? The one there now will be replaced.`,
                      ok: "Load it",
                    })
                  )
                    onSwitch(slot, loaded);
                } catch (err) {
                  onError((err as Error).message);
                }
              }}
            />
          </label>
        )}
      </p>
    </>
  );
}
