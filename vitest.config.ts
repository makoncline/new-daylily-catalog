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
      "tests/basic.test.ts", // Playwright test, not for Vitest
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
