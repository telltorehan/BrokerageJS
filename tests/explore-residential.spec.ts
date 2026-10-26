import * as fs from 'fs';
import * as path from 'path';
import { expect, test } from '@playwright/test';
import { DashboardPage } from '../src/pages/DashboardPage';
import { LoginPage } from '../src/pages/LoginPage';
import { ReferralWizard } from '../src/pages/ReferralWizard';
import { FormExplorer } from '../src/components/FormExplorer';

const email = process.env.BROKERAGE_EMAIL ?? '';
const password = process.env.BROKERAGE_PASSWORD ?? '';

test.beforeEach(() => {
  expect(email, 'BROKERAGE_EMAIL is not set').not.toBe('');
  expect(password, 'BROKERAGE_PASSWORD is not set').not.toBe('');
});

// Residential is the second form we already know by hand, so a clean run
// here is the second half of proving the engine generalizes rather than
// having been accidentally tuned to Care Home's specific DOM shape.
test('explores the residential referral form and reports what it finds', async ({ page }) => {
  test.setTimeout(240_000);

  const login = new LoginPage(page);
  await login.goto();
  await login.login(email, password);

  const dashboard = new DashboardPage(page);
  await dashboard.waitForLoaded();

  const modal = await dashboard.startNewReferral();
  await modal.choose('Residential');

  const wizard = new ReferralWizard(page);
  await wizard.waitForLoaded();

  const explorer = new FormExplorer(page);
  const report = await explorer.run('Residential');

  const dir = path.join(process.cwd(), 'exploration-reports');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `residential-${Date.now()}.json`);
  fs.writeFileSync(file, JSON.stringify(report, null, 2));
  console.log(`Exploration report written to ${file}`);
  console.log(
    `Reached summary: ${report.reachedSummary} | steps: ${report.summary.totalSteps} | fields: ${report.summary.totalFields}`,
  );

  expect(report.reachedSummary, `Exploration did not reach Summary - see ${file}`).toBe(true);
});
