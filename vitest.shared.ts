import path from "node:path"
import aliases from "vite-tsconfig-paths"
import type { ViteUserConfig } from "vitest/config"

const config: ViteUserConfig = {
  esbuild: {
    target: "es2020"
  },
  plugins: [aliases()],
  test: {
    exclude: [
      "**/node_modules/**"
    ],
    setupFiles: [path.join(__dirname, "vitest.setup.ts")],
    fakeTimers: {
      toFake: undefined
    },
    sequence: {
      concurrent: true
    },
    include: ["test/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["html"],
      reportsDirectory: "coverage",
      exclude: [
        "node_modules/",
        "dist/",
        "build/",
        "coverage/",
        "test/utils/",
        "**/*.d.ts",
        "**/*.config.*",
        "**/vitest.setup.*",
        "**/vitest.shared.*"
      ]
    }
  }
}

export default config
