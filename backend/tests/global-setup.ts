import { execSync } from 'child_process';

/** Applies all migrations to the test database once before the suite. */
export default function globalSetup(): void {
  const url = process.env['TEST_DATABASE_URL'] ?? 'postgresql://azure:azure@localhost:55433/azure_test';
  execSync('npx prisma migrate deploy', { env: { ...process.env, DATABASE_URL: url }, stdio: 'pipe' });
}
