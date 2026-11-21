import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// The sim must stay pure TypeScript so it can run headless (tests, balance runs)
// and stay deterministic. See docs/DESIGN.md §12.
describe("src/sim purity", () => {
  const dir = import.meta.dirname;
  const files = readdirSync(dir, { recursive: true, encoding: "utf8" }).filter(
    (f) => f.endsWith(".ts") && !f.endsWith(".test.ts"),
  );

  it.each(files)("%s has no UI imports or Math.random", (file) => {
    // Strip comments so docs can mention what's banned.
    const src = readFileSync(join(dir, file), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");
    expect(src).not.toMatch(/from\s+["'](react|react-dom)/);
    expect(src).not.toMatch(/from\s+["'](\.\.\/)+ui/);
    expect(src).not.toMatch(/Math\.random/);
  });
});
