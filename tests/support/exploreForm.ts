import * as fs from 'fs';
import * as path from 'path';
import { Page } from '@playwright/test';
import { DashboardPage } from '../../src/pages/DashboardPage';
import { LoginPage } from '../../src/pages/LoginPage';
import { ExplorationReport, FormExplorer } from '../../src/components/FormExplorer';

export interface ExplorationRun {
  report: ExplorationReport;
  file: string;
}

// shared by every explore-*.spec.ts: logs in, opens the named referral
// type's form, runs it through the generic engine, and writes the report.
// a dedicated wizard page object isn't needed here the way the hand-written
// suites use one - the engine only ever needs the form's URL to have
// loaded, not any form-specific knowledge of its steps or fields
export async function exploreReferralForm(page: Page, serviceType: string): Promise<ExplorationRun> {
  const email = process.env.BROKERAGE_EMAIL ?? '';
  const password = process.env.BROKERAGE_PASSWORD ?? '';

  const login = new LoginPage(page);
  await login.goto();
  await login.login(email, password);

  const dashboard = new DashboardPage(page);
  await dashboard.waitForLoaded();

  const modal = await dashboard.startNewReferral();
  await modal.choose(serviceType);
  await page.waitForURL(/\/forms\/\d+/);

  const explorer = new FormExplorer(page);
  const report = await explorer.run(serviceType);

  const dir = path.join(process.cwd(), 'exploration-reports');
  fs.mkdirSync(dir, { recursive: true });
  const slug = serviceType.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const file = path.join(dir, `${slug}-${Date.now()}.json`);
  fs.writeFileSync(file, JSON.stringify(report, null, 2));
  console.log(`Exploration report written to ${file}`);
  console.log(
    `Reached summary: ${report.reachedSummary} | steps: ${report.summary.totalSteps} | fields: ${report.summary.totalFields}`,
  );

  return { report, file };
}
