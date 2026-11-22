/**
 * The trip clock (M7.01, DESIGN.md §17.2): turning hours below into a time of
 * day, a length of time, and the days the town lives through meanwhile.
 * The hours themselves come from content/time.ts.
 */

/**
 * Days the town lives through before the party is back: the midnights the
 * trip crosses, at least one. A party that sets off at 08:00 and is out for
 * 30 hours climbs out at 14:00 the next day: one day.
 */
export function tripDays(startHour: number, hours: number): number {
  return Math.max(1, Math.floor((startHour + hours) / 24));
}

/** Where the trip's clock stands, `hours` after setting off at `startHour`. */
export function tripClock(startHour: number, hours: number): { day: number; time: string } {
  const minutes = Math.round((startHour + hours) * 60);
  const day = Math.floor(minutes / (24 * 60)) + 1;
  const m = minutes % (24 * 60);
  const pad = (n: number) => String(n).padStart(2, "0");
  return { day, time: `${pad(Math.floor(m / 60))}:${pad(m % 60)}` };
}

/** "3 days, 7 hours", "20 hours", "1 day": a length of time below. */
export function timeBelow(hours: number): string {
  const whole = Math.round(hours);
  const days = Math.floor(whole / 24);
  const rest = whole % 24;
  const parts = [
    days ? `${days} ${days === 1 ? "day" : "days"}` : "",
    rest || !days ? `${rest} ${rest === 1 ? "hour" : "hours"}` : "",
  ].filter(Boolean);
  return parts.join(", ");
}
