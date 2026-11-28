/**
 * Folding panels: a heading you click to open or close, with a one-line
 * summary (and optional buttons) that stay visible while it's closed. Which
 * panels are open is remembered in this browser only, never in the save.
 */
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

const KEY = "dpb-ui-open";
/** M9.22: the one open panel of each side pane, by pane. */
const GROUP_KEY = "dpb-ui-pane-open";
const GROUP_EVENT = "dpb-group-open";
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

/**
 * Panels that live inside another panel (M9.27: the party sits in the Roster),
 * by id. Opening one opens its parent first, and remembers it open so it
 * draws open once the parent has drawn it.
 */
const PARENT: Record<string, string> = {};

/** Say that panel `child` sits inside panel `parent`. */
export function nestFold(child: string, parent: string) {
  PARENT[child] = parent;
}

/** Open the panel `id` from elsewhere on the page (the town map's clicks, M8). */
export function openFold(id: string) {
  const parent = PARENT[id];
  if (parent) {
    openFold(parent);
    remember(id, true);
  }
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

/**
 * One panel open at a time (M9.22, #122): the side panes are accordions. Each
 * pane is a group; opening a panel in it closes the others. Which one is open
 * is remembered per pane ("" for none). Panels inside a panel aren't grouped.
 */
const FoldGroupContext = createContext<string | undefined>(undefined);

export function FoldGroup({ name, children }: { name: string; children: ReactNode }) {
  return <FoldGroupContext.Provider value={name}>{children}</FoldGroupContext.Provider>;
}

function groupsStored(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(GROUP_KEY) ?? "{}") ?? {};
  } catch {
    return {};
  }
}

/** The open panel of each group this visit, starting from what was remembered. */
let groupOpen: Record<string, string> | undefined;
const groups = () => (groupOpen ??= groupsStored());

function setGroupOpen(group: string, id: string) {
  groups()[group] = id;
  try {
    localStorage.setItem(GROUP_KEY, JSON.stringify(groups()));
  } catch {
    // Blocked storage: the pane just forgets.
  }
  window.dispatchEvent(new CustomEvent(GROUP_EVENT, { detail: { group, id } }));
}

/** Open/closed state for `id`, remembered across visits. */
export function useFold(id: string, defaultOpen: boolean, group?: string) {
  const [open, setOpen] = useState(() => {
    if (!group) return remembered()[id] ?? defaultOpen;
    const g = groups();
    // Nothing chosen in this pane yet: the first panel that would be open claims it.
    if (g[group] === undefined && (remembered()[id] ?? defaultOpen)) g[group] = id;
    return g[group] === id;
  });
  useEffect(() => {
    const onOpen = (e: Event) => {
      if ((e as CustomEvent<string>).detail !== id) return;
      if (group) setGroupOpen(group, id);
      else remember(id, true);
      setOpen(true);
    };
    const onGroup = (e: Event) => {
      const d = (e as CustomEvent<{ group: string; id: string }>).detail;
      if (d.group === group && d.id !== id) setOpen(false);
    };
    window.addEventListener(OPEN_EVENT, onOpen);
    if (group) window.addEventListener(GROUP_EVENT, onGroup);
    return () => {
      window.removeEventListener(OPEN_EVENT, onOpen);
      if (group) window.removeEventListener(GROUP_EVENT, onGroup);
    };
  }, [id, group]);
  const toggle = () => {
    const next = !open;
    if (group) setGroupOpen(group, next ? id : "");
    else remember(id, next);
    setOpen(next);
  };
  return [open, toggle] as const;
}

export function Fold({
  id,
  title,
  summary,
  actions,
  closedActions,
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
  /** More buttons beside the title, only while it's closed (M9.27). */
  closedActions?: ReactNode;
  defaultOpen?: boolean;
  level?: 2 | 3;
  className?: string;
  /** Inline style for the panel, e.g. a border colour (M9.07). */
  style?: CSSProperties;
  children: ReactNode;
}) {
  const group = useContext(FoldGroupContext);
  const [open, toggle] = useFold(id, defaultOpen, level === 2 ? group : undefined);
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
        {actions || (!open && closedActions) ? (
          <span className="fold-actions">
            {actions}
            {open ? null : closedActions}
          </span>
        ) : null}
      </div>
      {open ? (
        <div id={`${id}-body`} className="fold-body">
          <FoldGroupContext.Provider value={undefined}>{children}</FoldGroupContext.Provider>
        </div>
      ) : null}
    </section>
  );
}
