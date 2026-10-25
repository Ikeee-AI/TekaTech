// Browser checks for the failure drill (#119). See e2e/README.md.
import { defineConfig, devices } from '@playwright/test'

const PORT = 4174

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // A production build served by `vite preview`, built with fake service addresses.
    // Every call to them is answered inside the test (e2e/support/fakeApi.js), so the
    // checks never reach dev, production, Supabase or OpenAI. These variables win over
    // a local frontend/.env because Vite never overwrites ones already set.
    command: `npx vite build --outDir e2e-dist --emptyOutDir && npx vite preview --outDir e2e-dist --host 127.0.0.1 --port ${PORT} --strictPort`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      VITE_API_BASE_URL: 'http://api.e2e.test',
      VITE_SUPABASE_URL: 'http://supabase.e2e.test',
      VITE_SUPABASE_ANON_KEY: 'e2e-not-a-real-key',
    },
  },
})
