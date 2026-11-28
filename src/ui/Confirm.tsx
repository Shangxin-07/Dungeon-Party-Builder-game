/**
 * In-game "are you sure?" dialogs (M9.19), instead of the browser's own
 * confirm(), which looks foreign and can be switched off by the player. Call
 * askConfirm() anywhere; <ConfirmHost /> (mounted once, in App) shows it.
 */
import { useEffect, useRef, useState } from "react";

export type ConfirmAsk = {
  message: string;
  /** The yes button: "OK" if left out. */
  ok?: string;
  /** The no button: "Cancel" if left out. */
  cancel?: string;
  /** The yes button is a destructive one (delete, dismiss, start over). */
  danger?: boolean;
  /** A tick box under the message, such as "Don't warn me again". */
  check?: { label: string; onChange: (checked: boolean) => void };
};

type Pending = ConfirmAsk & { answer: (yes: boolean) => void };

const listeners = new Set<(p: Pending) => void>();

/** Ask the player; resolves true for yes. Falls back to yes if no host is mounted. */
export function askConfirm(ask: ConfirmAsk): Promise<boolean> {
  if (!listeners.size) return Promise.resolve(true);
  return new Promise((answer) => listeners.forEach((f) => f({ ...ask, answer })));
}

/** The dialog itself: over everything, Escape or the backdrop says no. */
export function ConfirmHost() {
  const [pending, setPending] = useState<Pending>();
  const [checked, setChecked] = useState(false);
  const okRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const on = (p: Pending) => {
      setChecked(false);
      setPending(p);
    };
    listeners.add(on);
    return () => {
      listeners.delete(on);
    };
  }, []);
  useEffect(() => {
    if (!pending) return;
    okRef.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(false);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [pending]);
  if (!pending) return null;
  function close(yes: boolean) {
    pending?.answer(yes);
    setPending(undefined);
  }
  return (
    <div className="confirm-backdrop" onClick={() => close(false)}>
      <div
        className="confirm-box"
        role="alertdialog"
        aria-modal="true"
        aria-label={pending.message}
        onClick={(e) => e.stopPropagation()}
      >
        <p>{pending.message}</p>
        {pending.check ? (
          <label className="small confirm-check">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => {
                setChecked(e.target.checked);
                pending.check!.onChange(e.target.checked);
              }}
            />{" "}
            {pending.check.label}
          </label>
        ) : null}
        <div className="row-buttons">
          <button
            ref={okRef}
            type="button"
            className={`btn ${pending.danger ? "btn-danger" : "btn-main"}`}
            onClick={() => close(true)}
          >
            {pending.ok ?? "OK"}
          </button>
          <button type="button" className="btn" onClick={() => close(false)}>
            {pending.cancel ?? "Cancel"}
          </button>
        </div>
      </div>
    </div>
  );
}
