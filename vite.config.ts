/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { execSync } from "node:child_process";

// Short commit hash for the version tooltip, so deploys can be told apart.
function buildCommit(): string {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA.slice(0, 7);
  try {
    return execSync("git rev-parse --short HEAD").toString().trim();
  } catch {
    return "dev";
  }
}

// GitHub Pages serves the site from /<repo-name>/, so assets need that prefix.
// The deploy workflow sets BASE_PATH; local dev uses "/".
export default defineConfig({
  base: process.env.BASE_PATH ?? "/",
  plugins: [react()],
  define: {
    __BUILD_COMMIT__: JSON.stringify(buildCommit()),
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
