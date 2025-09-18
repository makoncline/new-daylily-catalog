import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      // Exclude Playwright e2e specs by pattern
      "tests/**/*.e2e.ts",
      "tests/**/*.e2e.tsx",
    ],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@prisma/client": path.resolve(
        __dirname,
        "prisma/generated/sqlite-client",
      ),
      "@/env": path.resolve(__dirname, "src/env.js"),
    },
  },
});
