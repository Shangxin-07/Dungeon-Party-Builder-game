/**
 * Folding panels: a heading you click to open or close, with a one-line
 * summary (and optional buttons) that stay visible while it's closed. Which
 * panels are open is remembered in this browser only, never in the save.
 */
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";

const KEY = "dpb-ui-open";
const OPEN_EVENT = "dpb-open-fold";
const TARGET_EVENT = "dpb-show-target";

/**
 * Call `f` with each element id showFold is about to bring into view, before
 * it looks for it: a panel with its own tabs (Buildings) can switch to the one
 * holding it. Returns the unsubscribe.
 */
export function onShowTarget(f: (target: string) => void): () => void {
  const on = (e: Event) => f((e as CustomEvent<string>).detail);
  window.addEventListener(TARGET_EVENT, on);
  return () => window.removeEventListener(TARGET_EVENT, on);
}

/** Open the panel `id` from elsewhere on the page (the town map's clicks, M8). */
export function openFold(id: string) {
  window.dispatchEvent(new CustomEvent<string>(OPEN_EVENT, { detail: id }));
}

/**
 * Call `f` with the id of every panel opened with openFold: the town screen
 * uses it to switch to the tab the panel is on. Returns the unsubscribe.
 */
export function onOpenFold(f: (id: string) => void): () => void {
  const on = (e: Event) => f((e as CustomEvent<string>).detail);
  window.addEventListener(OPEN_EVENT, on);
  return () => window.removeEventListener(OPEN_EVENT, on);
}

/**
 * Open a panel and bring `target` (an element id) into view with a flash.
 * Two frames' wait, so a tab switched to by the open has drawn first.
 */
export function showFold(fold: string, target: string) {
  openFold(fold);
  window.dispatchEvent(new CustomEvent<string>(TARGET_EVENT, { detail: target }));
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      const el = document.getElementById(target);
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.remove("flash");
      void el.getBoundingClientRect();
      el.classList.add("flash");
    }),
  );
}

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
  useEffect(() => {
    const onOpen = (e: Event) => {
      if ((e as CustomEvent<string>).detail !== id) return;
      remember(id, true);
      setOpen(true);
    };
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, [id]);
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
  style,
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
  /** Inline style for the panel, e.g. a border colour (M9.07). */
  style?: CSSProperties;
  children: ReactNode;
}) {
  const [open, toggle] = useFold(id, defaultOpen);
  const H = level === 2 ? "h2" : "h3";
  return (
    <section
      className={`fold fold-${level}${open ? " open" : ""}${level === 2 ? " panel" : ""} ${className}`}
      aria-labelledby={`${id}-heading`}
      style={style}
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
