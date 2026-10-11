import { execSync } from 'node:child_process';

/** Brings the test database up to date with the migrations (creates it if missing). Non-destructive:
 *  every test registers its own user and workspace, so earlier runs do not affect later ones. */
export default function setup() {
  const url = process.env.FUNCTIONAL_DATABASE_URL ?? '';
  if (!/_test(\?|$)/.test(url.split('/').pop() ?? '')) {
    throw new Error('Functional tests only run against a database whose name ends in _test.');
  }
  execSync('npx prisma migrate deploy', {
    stdio: 'pipe',
    env: { ...process.env, DATABASE_URL: url, PRISMA_HIDE_UPDATE_MESSAGE: '1' }
  });
}
