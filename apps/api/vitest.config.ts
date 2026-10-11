import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    // Secrets are read at import time, so they must exist before any module loads.
    env: {
      NODE_ENV: 'test',
      JWT_ACCESS_SECRET: 'test-access-secret',
      JWT_REFRESH_SECRET: 'test-refresh-secret',
      WEBHOOK_SIGNING_SECRET: 'test-webhook-secret',
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/formforge_test'
    }
  }
});
