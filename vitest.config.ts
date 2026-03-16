import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    testTimeout: 15000, // Increase to 15s to allow for connection timeouts
    poolOptions: {
      threads: {
        singleThread: true, // Sequential execution for SQLite stability
      }
    }
  }
})
