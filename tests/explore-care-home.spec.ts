import * as fs from 'fs';
import * as path from 'path';
import { expect, test } from '@playwright/test';
import { DashboardPage } from '../src/pages/DashboardPage';
import { LoginPage } from '../src/pages/LoginPage';
import { CareHomeWizard } from '../src/pages/CareHomeWizard';
import { FormExplorer } from '../src/components/FormExplorer';

const email = process.env.BROKERAGE_EMAIL ?? '';
const password = process.env.BROKERAGE_PASSWORD ?? '';

test.beforeEach(() => {
  expect(email, 'BROKERAGE_EMAIL is not set').not.toBe('');
  expect(password, 'BROKERAGE_PASSWORD is not set').not.toBe('');
});

// This is a discovery run, not a pass/fail assertion suite: it walks the
// form generically, filling whatever it finds and reacting to whatever
// each fill reveals, and writes everything it saw to a report file. Care
// Home is the right first target because we already know, from building
// it by hand, exactly what the correct flow looks like - so this run can
// be checked against known-good ground truth before trusting it on a
// form nobody has explored yet.
test('explores the care within the home form and reports what it finds', async ({ page }) => {
  // a generic scan-and-fill pass does more DOM work per field than a
  // hand-written flow (re-scans the whole step after every fill), so the
  // default 90s budget is too tight even for a run that completes correctly
  test.setTimeout(240_000);

  const login = new LoginPage(page);
  await login.goto();
  await login.login(email, password);

  const dashboard = new DashboardPage(page);
  await dashboard.waitForLoaded();

  const modal = await dashboard.startNewReferral();
  await modal.choose('Care Within the Home');

  const wizard = new CareHomeWizard(page);
  await wizard.waitForLoaded();

  const explorer = new FormExplorer(page);
  const report = await explorer.run('Care Within the Home');

  const dir = path.join(process.cwd(), 'exploration-reports');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `care-home-${Date.now()}.json`);
  fs.writeFileSync(file, JSON.stringify(report, null, 2));
  console.log(`Exploration report written to ${file}`);
  console.log(
    `Reached summary: ${report.reachedSummary} | steps: ${report.summary.totalSteps} | fields: ${report.summary.totalFields}`,
  );

  // this run's job is to produce evidence, not to pass or fail on its
  // own - but if it never even reached the summary page, something is
  // badly wrong and the report alone wouldn't make that obvious enough
  expect(report.reachedSummary, `Exploration did not reach Summary - see ${file}`).toBe(true);
});
