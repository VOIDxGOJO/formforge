import { config as loadEnv } from 'dotenv';
import { defineConfig } from 'vitest/config';

// Functional tests run the real Express app against a real PostgreSQL database.
// The database is a separate "<name>_test" database next to the one in .env,
// migrated before every run (see test/functional/setup.ts).
loadEnv();
const testDatabaseUrl =
  process.env.FUNCTIONAL_DATABASE_URL ??
  (process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/formforge').replace(/\/([^/?]+)(\?|$)/, '/$1_test$2');

// The global setup runs in this process, before test.env applies.
process.env.FUNCTIONAL_DATABASE_URL = testDatabaseUrl;

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/functional/**/*.test.ts'],
    globalSetup: ['test/functional/setup.ts'],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 120_000,
    env: {
      NODE_ENV: 'test',
      JWT_ACCESS_SECRET: 'test-access-secret',
      JWT_REFRESH_SECRET: 'test-refresh-secret',
      WEBHOOK_SIGNING_SECRET: 'test-webhook-secret',
      DATABASE_URL: testDatabaseUrl,
      // Model calls go to a fake provider; no key means no real request can leave the machine.
      AI_API_KEY: '',
      // Dummy key: the Resend client needs one at import; no test sends e-mail.
      RESEND_API_KEY: 're_test_not_a_real_key'
    }
  }
});
