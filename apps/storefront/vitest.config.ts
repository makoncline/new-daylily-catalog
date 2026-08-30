import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const appDirectory = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": path.join(appDirectory, "src"),
    },
  },
  test: {
    environment: "node",
    fileParallelism: false,
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
  },
});
