/**
 * The town screen's tabs, and the "needs you" list at the top of News: the
 * things waiting on the player, each pointing at the tab and panel to open.
 * Pure: it reads the town and never changes it.
 */
import type { Index } from "../../sim/library";
import { isLow } from "../../sim/morale";
import { awaySet, outingStatus, restockPlan, type TownState } from "../../sim/town";

/**
 * Where a panel lives (M9.01). On a wide screen the town is three panes: the
 * guild (parties, roster, recruits) on the left, the town's works (market,
 * buildings, workshops) on the right, and the centre's tabs between them, with
 * a one-line news strip always above the centre (a button for each thing
 * waiting on you) and the townsfolk always below it. On
 * a phone each pane and centre tab is a tab, and the news strip tops them all.
 */
export type TabId = "guild" | "town" | "pit" | "debrief" | "news" | "books" | "works";

/** The centre pane's tabs. */
export type CentreTab = Exclude<TabId, "guild" | "works">;

export const TABS: { id: TabId; name: string; holds: string; pane: "left" | "centre" | "right" }[] =
  [
    {
      id: "guild",
      name: "Guild",
      holds:
        "The next party and its orders, parties on file, parties below, the roster and recruits",
      pane: "left",
    },
    { id: "town", name: "Town", holds: "The town map and the townsfolk", pane: "centre" },
    {
      id: "pit",
      name: "The Pit",
      holds: "The pit, posts, research, and the lost and fallen",
      pane: "centre",
    },
    { id: "debrief", name: "Debrief", holds: "Parties back from below", pane: "centre" },
    {
      id: "news",
      name: "News",
      holds: "Everything waiting on you, offers in town and talk",
      pane: "centre",
    },
    { id: "books", name: "Books", holds: "The accounts, the memorial and saves", pane: "centre" },
    { id: "works", name: "Buildings", holds: "The market, buildings and workshops", pane: "right" },
  ];

export const isCentre = (t: TabId): t is CentreTab =>
  TABS.find((x) => x.id === t)?.pane === "centre";

/**
 * Which tab each folding panel lives on, so opening one from elsewhere (the
 * town map, the news strip) can switch to it first.
 */
export const FOLD_TAB: Record<string, TabId> = {
  camp: "guild",
  recruits: "guild",
  restock: "guild",
  party: "guild",
  "parties-on-file": "guild",
  scouting: "guild",
  roster: "guild",
  away: "guild",
  townmap: "town",
  folk: "town",
  market: "works",
  buildings: "works",
  workshops: "works",
  pit: "pit",
  "pit-floors": "pit",
  research: "pit",
  lost: "pit",
  fallen: "pit",
  back: "debrief",
  offers: "news",
  talk: "news",
  accounts: "books",
  memorial: "books",
  saves: "books",
};

/** At the camp the posts are the game, so they sit with the guild. */
export const foldTab = (town: TownState, fold: string): TabId | undefined =>
  fold === "posts" ? (town.camp ? "guild" : "pit") : FOLD_TAB[fold];

export type Need = {
  key: string;
  text: string;
  /** A few words for the news strip's button (M9.01); the text shows on hover. */
  short: string;
  /** The panel to open, and the element in it to bring into view. */
  fold: string;
  target: string;
  /** The button's word. */
  go: string;
  /** warn: bad news; good: good news; neither: just news. */
  tone?: "warn" | "good";
};

const names = (xs: { name: string }[]) =>
  xs.length <= 2
    ? xs.map((x) => x.name).join(" and ")
    : `${xs
        .slice(0, -1)
        .map((x) => x.name)
        .join(", ")} and ${xs.at(-1)!.name}`;
const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

/** Everything waiting on the player, most pressing first. */
export function needsYou(ix: Index, town: TownState): Need[] {
  const out: Need[] = [];
  const away = awaySet(town);
  const home = town.roster.filter((h) => !away.has(h.id));

  for (const o of town.outings) {
    const status = outingStatus(ix, town, o);
    if (status === "out") continue;
    out.push({
      key: `outing:${o.id}`,
      short: `${o.name} ${status === "lost" ? "lost?" : "overdue"}`,
      text: `${o.name} ${status === "lost" ? "may be lost" : "is overdue"} (due back day ${o.expected})`,
      fold: "away",
      target: "away-heading",
      go: "Look",
      tone: "warn",
    });
  }
  if (town.haul.length) {
    const trip = town.trips.at(-1);
    out.push({
      key: "haul",
      short: `Haul: ${town.haul.length} to settle`,
      text: `${trip?.name ?? "A party"} is back: ${town.haul.length} ${plural(town.haul.length, "piece", "pieces")} of haul to sell, salvage or study`,
      fold: "back",
      target: "debrief-heading",
      go: "Debrief",
      tone: "good",
    });
  }
  const bodies = town.bodies.length;
  if (bodies)
    out.push({
      key: "bodies",
      short: `${bodies} ${plural(bodies, "body", "bodies")} to bury`,
      text: `${bodies} ${plural(bodies, "body waits", "bodies wait")} to be raised or buried`,
      fold: "fallen",
      target: "fallen-heading",
      go: "See",
      tone: "warn",
    });
  const sites = town.sites.filter((s) => !s.outing).length;
  if (sites)
    out.push({
      key: "lost",
      short: `${sites} lost below`,
      text: `${sites} ${plural(sites, "party is", "parties are")} lost below and could be searched for`,
      fold: "lost",
      target: "lost-heading",
      go: "See",
      tone: "warn",
    });
  const ups = home.filter((h) => h.levelUps.length);
  if (ups.length)
    out.push({
      key: "levelups",
      short: `Level-ups (${ups.length})`,
      text: `${names(ups)} ${plural(ups.length, "has a level", "have levels")} to spend`,
      fold: "roster",
      target: `hero-card-${ups[0]!.id}`,
      go: "Roster",
      tone: "good",
    });
  const raises = home.filter((h) => h.raiseAsk);
  if (raises.length)
    out.push({
      key: "raises",
      short: `Raise: ${raises[0]!.name}${raises.length > 1 ? ` +${raises.length - 1}` : ""}`,
      text: `${names(raises)} ${plural(raises.length, "wants", "want")} a raise`,
      fold: "roster",
      target: `hero-card-${raises[0]!.id}`,
      go: "Roster",
    });
  const unhappy = home.filter((h) => isLow(ix, h));
  if (unhappy.length)
    out.push({
      key: "unhappy",
      short: `Unhappy: ${unhappy[0]!.name}${unhappy.length > 1 ? ` +${unhappy.length - 1}` : ""}`,
      text: `${names(unhappy)} ${plural(unhappy.length, "is", "are")} unhappy and may not follow orders`,
      fold: "roster",
      target: `hero-card-${unhappy[0]!.id}`,
      go: "Roster",
      tone: "warn",
    });
  if (town.freeHires > 0)
    out.push({
      key: "free-hires",
      short: `${town.freeHires} free ${plural(town.freeHires, "recruit", "recruits")}`,
      text: `${town.freeHires} ${plural(town.freeHires, "recruit", "recruits")} will sign for nothing`,
      fold: "recruits",
      target: "recruits-heading",
      go: "Recruits",
      tone: "good",
    });
  const offers = town.offers.length;
  if (offers)
    out.push({
      key: "offers",
      short: `${offers} ${plural(offers, "offer", "offers")} in town`,
      text: `${offers} ${plural(offers, "offer waits", "offers wait")} in town for an answer`,
      fold: "offers",
      target: "offers-heading",
      go: "Look",
    });
  if (!town.camp) {
    const restock = restockPlan(ix, town);
    if (restock.length)
      out.push({
        key: "restock",
        short: `Restock ${restock.length}`,
        text: `The last trip used up ${restock.length} ${plural(restock.length, "thing", "things")} to buy again`,
        fold: "restock",
        target: "restock-heading",
        go: "Restock",
      });
  }
  if (town.damaged.length)
    out.push({
      key: "damaged",
      short: `${town.damaged.length === 1 ? ix.building(town.damaged[0]!).name : `${town.damaged.length} buildings`} damaged`,
      text: `${names(town.damaged.map((id) => ix.building(id)))} ${plural(town.damaged.length, "is", "are")} damaged and won't work until repaired`,
      fold: "buildings",
      target: `building-${town.damaged[0]}`,
      go: "Repair",
      tone: "warn",
    });
  return out;
}

/** How many needs sit on each tab, for the counts on the tabs. */
export function needsByTab(town: TownState, needs: Need[]): Partial<Record<TabId, number>> {
  const out: Partial<Record<TabId, number>> = {};
  for (const n of needs) {
    const tab = foldTab(town, n.fold);
    if (tab) out[tab] = (out[tab] ?? 0) + 1;
  }
  return out;
}
