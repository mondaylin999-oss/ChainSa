import { defineConfig } from "vitest/config";
import path from "node:path";
import { loadEnvConfig } from "@next/env";

// Same .env.local loading as `next dev`, so the comparison uses your real (free) AI keys and models.
// Next's loader skips .env.local when NODE_ENV is "test" (vitest sets that), so load it in development mode here.
const root = path.resolve(__dirname, "../..");
const prevNodeEnv = process.env.NODE_ENV;
(process.env as Record<string, string | undefined>).NODE_ENV = "development";
loadEnvConfig(root, true);
(process.env as Record<string, string | undefined>).NODE_ENV = prevNodeEnv;

export default defineConfig({
  root,
  resolve: { alias: { "@": path.resolve(root, "src"), "server-only": path.resolve(root, "tests/server-only-stub.ts") } },
  test: {
    environment: "node",
    include: ["scripts/compare-ai/compare.run.ts"],
    testTimeout: 45 * 60 * 1000,
    // print progress lines as they happen
    reporters: ["verbose"],
  },
});
