import { fileURLToPath, URL } from 'node:url'
import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config.ts'

export default defineConfig((configEnv) =>
  mergeConfig(viteConfig(configEnv), {
    test: {
      environment: 'jsdom',
      include: ['src/**/*.{test,spec}.ts'],
      setupFiles: ['src/test/setup.ts'],
      root: fileURLToPath(new URL('./', import.meta.url)),
      restoreMocks: true,
      unstubEnvs: true,
      // Fixed values so results do not depend on the developer's local .env.
      env: {
        VITE_USE_MOCK_API: 'false',
        VITE_API_BASE_URL: '',
        VITE_MOCK_USERNAME: 'admin',
        VITE_MOCK_PASSWORD: 'admin123',
        VITE_MOCK_ROLE: 'admin',
      },
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json-summary', 'html'],
        reportsDirectory: 'coverage',
        include: ['src/**/*.{ts,vue}'],
        exclude: ['src/main.ts', 'src/vite-env.d.ts', 'src/test/**', 'src/**/*.test.ts'],
      },
    },
  }),
)
