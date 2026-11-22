/**
 * The debrief's tally (M7.03, DESIGN.md §17.4): what a trip amounted to,
 * worked out from its log. Read only: nothing here changes the town.
 */
import type { ExpeditionEvent } from "../expedition";
import type { Index } from "../library";
import type { TripReport } from "./state";

/** One floor of the trip's timeline. */
export interface FloorTally {
  floor: number;
  /** Rooms walked into, by name, in order ("Safe nook"), with what happened there. */
  rooms: { name: string; what: string[] }[];
  fights: number;
  caches: number;
  camps: number;
  rests: number;
  /** Hours into the trip the party first and last set foot here. */
  from?: number;
  to?: number;
}

/** One kind of monster slain. */
export interface SlainLine {
  /** Monster id, or the name for something not in the library (a summoned thing). */
  id: string;
  name: string;
  count: number;
  /** Who killed them: hero name -> count. "" for kills nobody struck (bleeding, a trap). */
  by: Record<string, number>;
}

export interface Tally {
  hours?: number;
  days: number;
  deepest: number;
  rooms: number;
  caches: number;
  camps: number;
  floors: FloorTally[];
  slain: SlainLine[];
  slainTotal: number;
  /** The strongest thing the party killed, and who did it. */
  biggest?: { name: string; by: string; floor: number; power: number };
  /** Haul: pieces (not coins or materials), coins paid, materials brought. */
  pieces: number;
  coins: number;
  materials: number;
}

/** "Occupied chamber" from "Occupied chamber. Eyes glint in the torchlight." */
const roomName = (e: ExpeditionEvent) => e.text.split(". ")[0]!.replace(/\.$/, "");

export function tripTally(ix: Index, trip: TripReport): Tally {
  const r = trip.result;
  const names = new Map(trip.party.map((h) => [h.id, h.name]));
  const floors = new Map<number, FloorTally>();
  const floorOf = (n: number) => {
    let f = floors.get(n);
    if (!f) floors.set(n, (f = { floor: n, rooms: [], fights: 0, caches: 0, camps: 0, rests: 0 }));
    return f;
  };
  const slain = new Map<string, SlainLine>();
  let biggest: Tally["biggest"];
  let foes = new Map<string, { id?: string; name: string }>();
  let room: FloorTally["rooms"][number] | undefined;
  const note = (what: string) => {
    if (room && !room.what.includes(what)) room.what.push(what);
  };

  for (const e of r.log) {
    if (e.floor > 0 && e.kind !== "combat" && e.hour !== undefined) {
      const f = floorOf(e.floor);
      f.from = Math.min(f.from ?? e.hour, e.hour);
      f.to = Math.max(f.to ?? e.hour, e.hour);
    }
    switch (e.kind) {
      case "room":
        room = { name: roomName(e), what: [] };
        floorOf(e.floor).rooms.push(room);
        break;
      case "fight":
        if (e.monsters) {
          floorOf(e.floor).fights++;
          foes = new Map(e.monsters.map((m) => [m.uid, { id: m.monsterId, name: m.name }]));
          note("fight");
        }
        break;
      case "secret":
        if (/notices|finds/.test(e.text)) {
          floorOf(e.floor).caches++;
          note("hidden cache");
        }
        break;
      case "camp":
        floorOf(e.floor).camps++;
        break;
      case "rest":
        if (/rests/.test(e.text)) {
          floorOf(e.floor).rests++;
          note("rest");
        }
        break;
      case "trap":
        note("trap");
        break;
      case "loot":
        note("loot");
        break;
      case "parley":
        note("parley");
        break;
      case "event":
        note("strange meeting");
        break;
      case "combat": {
        const c = e.combat;
        if (c?.kind !== "killed" || !c.target || names.has(c.target)) break;
        const foe = foes.get(c.target);
        const def = foe?.id ? ix.lib.monsters.find((m) => m.id === foe.id) : undefined;
        const id = def?.id ?? foe?.name ?? c.target;
        const name = def?.name ?? foe?.name?.replace(/ [A-Z]$/, "") ?? c.target;
        const line = slain.get(id) ?? { id, name, count: 0, by: {} };
        const by = (c.actor && names.get(c.actor)) ?? "";
        line.count++;
        line.by[by] = (line.by[by] ?? 0) + 1;
        slain.set(id, line);
        const power = def?.power ?? 0;
        if (by && (!biggest || power > biggest.power))
          biggest = { name, by, floor: e.floor, power };
        break;
      }
    }
  }

  const all = [...floors.values()].sort((a, b) => a.floor - b.floor);
  const haul = r.haul.filter((h) => !h.keep);
  const isCoins = (id: string) => ix.item(id).tags.includes("coins");
  const isMaterial = (id: string) => ix.item(id).slot === "material";
  const lines = [...slain.values()].sort(
    (a, b) => b.count - a.count || a.name.localeCompare(b.name),
  );
  return {
    hours: r.hours,
    days: r.days,
    deepest: r.deepestFloor,
    rooms: r.roomsVisited,
    caches: r.secrets?.found ?? 0,
    camps: all.reduce((s, f) => s + f.camps, 0),
    floors: all,
    slain: lines,
    slainTotal: lines.reduce((s, l) => s + l.count, 0),
    biggest,
    pieces: haul.filter((h) => !isCoins(h.item) && !isMaterial(h.item)).length,
    coins: trip.coins ?? haul.filter((h) => isCoins(h.item)).reduce((s, h) => s + h.value, 0),
    materials: haul.filter((h) => isMaterial(h.item)).length,
  };
}
