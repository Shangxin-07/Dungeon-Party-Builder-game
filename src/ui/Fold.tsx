/**
 * Folding panels: a heading you click to open or close, with a one-line
 * summary (and optional buttons) that stay visible while it's closed. Which
 * panels are open is remembered in this browser only, never in the save.
 */
import { useState, type ReactNode } from "react";

const KEY = "dpb-ui-open";

function remembered(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}") ?? {};
  } catch {
    return {};
  }
}

function remember(id: string, open: boolean) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...remembered(), [id]: open }));
  } catch {
    // Private windows and blocked storage: the panel just forgets.
  }
}

/** Open/closed state for `id`, remembered across visits. */
export function useFold(id: string, defaultOpen: boolean) {
  const [open, setOpen] = useState(() => remembered()[id] ?? defaultOpen);
  const toggle = () =>
    setOpen((o) => {
      remember(id, !o);
      return !o;
    });
  return [open, toggle] as const;
}

export function Fold({
  id,
  title,
  summary,
  actions,
  defaultOpen = false,
  level = 2,
  className = "",
  children,
}: {
  /** Unique and stable: the key its open state is remembered under. */
  id: string;
  title: ReactNode;
  /** Shown beside the title, open or closed. */
  summary?: ReactNode;
  /** Buttons beside the title, usable without opening the panel. */
  actions?: ReactNode;
  defaultOpen?: boolean;
  level?: 2 | 3;
  className?: string;
  children: ReactNode;
}) {
  const [open, toggle] = useFold(id, defaultOpen);
  const H = level === 2 ? "h2" : "h3";
  return (
    <section
      className={`fold fold-${level}${open ? " open" : ""}${level === 2 ? " panel" : ""} ${className}`}
      aria-labelledby={`${id}-heading`}
    >
      <div className="fold-head">
        <H id={`${id}-heading`}>
          <button
            type="button"
            className="fold-toggle"
            aria-expanded={open}
            aria-controls={`${id}-body`}
            onClick={toggle}
          >
            <span className="chev" aria-hidden="true">
              ▸
            </span>
            {title}
          </button>
        </H>
        {summary ? <span className="fold-summary">{summary}</span> : null}
        {actions ? <span className="fold-actions">{actions}</span> : null}
      </div>
      {open ? (
        <div id={`${id}-body`} className="fold-body">
          {children}
        </div>
      ) : null}
    </section>
  );
}
