import * as fs from 'fs';
import * as path from 'path';
import { expect, Page, test } from '@playwright/test';
import { DashboardPage } from '../../src/pages/DashboardPage';
import { LoginPage } from '../../src/pages/LoginPage';
import { ExplorationReport, FilledField, FormExplorer } from '../../src/components/FormExplorer';
import { renderReportHtml } from './renderReportHtml';

export interface ExplorationRun {
  report: ExplorationReport;
  file: string;
}

// walks every field (including ones revealed by an earlier answer) and
// soft-fails each one that didn't actually fill - soft because one bad
// field shouldn't stop the others from being checked and reported in the
// same run, the way a hard assert would
function checkFields(fields: FilledField[], stepIndex: number, formName: string): void {
  for (const field of fields) {
    if (field.kind !== 'unknown' && field.value.startsWith('<failed:')) {
      expect.soft(field.value, `${formName} / Step ${stepIndex}: "${field.label}" failed to fill`).not.toMatch(/^<failed:/);
    }
    if (field.revealed.length) {
      checkFields(field.revealed, stepIndex, formName);
    }
  }
}

export async function loginAndGoToDashboard(page: Page): Promise<void> {
  const email = process.env.BROKERAGE_EMAIL ?? '';
  const password = process.env.BROKERAGE_PASSWORD ?? '';

  const login = new LoginPage(page);
  await login.goto();
  await login.login(email, password);

  const dashboard = new DashboardPage(page);
  await dashboard.waitForLoaded();
}

// shared by both ways of opening a form (clicking a tile, or navigating
// straight to its URL) - runs it through the generic engine, writes and
// attaches the report, and soft-fails every field that didn't fill
async function runExploration(page: Page, formLabel: string): Promise<ExplorationRun> {
  const explorer = new FormExplorer(page);
  const report = await explorer.run(formLabel);

  const dir = path.join(process.cwd(), 'exploration-reports');
  fs.mkdirSync(dir, { recursive: true });
  const slug = formLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const file = path.join(dir, `${slug}-${Date.now()}.json`);
  fs.writeFileSync(file, JSON.stringify(report, null, 2));
  console.log(`Exploration report written to ${file}`);
  console.log(
    `Reached summary: ${report.reachedSummary} | steps: ${report.summary.totalSteps} | fields: ${report.summary.totalFields}`,
  );

  // attach the full report to this test's result so it's visible straight
  // from `npx playwright show-report`, not just a side file nobody opens.
  // the slug keeps attachment names distinct when several forms are
  // explored within the same test (the multi-form audit)
  await test.info().attach(`exploration-report-${slug}.json`, { body: JSON.stringify(report, null, 2), contentType: 'application/json' });
  await test.info().attach(`exploration-report-${slug}.html`, { body: renderReportHtml(report), contentType: 'text/html' });

  // surface every field that failed to fill as its own named failure in
  // Playwright's own report, instead of something only visible by
  // opening a separate JSON file and reading closely
  for (const step of report.steps) {
    checkFields(step.fields, step.stepIndex, formLabel);
    if (step.outcome === 'failed' && step.error) {
      expect.soft(step.error, `${formLabel} / Step ${step.stepIndex} could not advance`).toBe('');
    }
  }

  return { report, file };
}

// assumes the page is already logged in and on the dashboard - opens the
// named referral type from the "start a new referral" modal and runs it
// through the generic engine. kept separate from exploreReferralForm so
// an audit of several forms in one run can reuse a single login instead
// of logging in again for each one
export async function exploreOpenForm(page: Page, serviceType: string): Promise<ExplorationRun> {
  const dashboard = new DashboardPage(page);
  const modal = await dashboard.startNewReferral();
  await modal.choose(serviceType);
  await page.waitForURL(/\/forms\/\d+/);
  return runExploration(page, serviceType);
}

// opens a form by navigating straight to its own URL instead of finding
// and clicking the right tile by its label - used by the dynamic
// multi-form audit, which already has each form's real data-url from
// the modal's markup and so doesn't need to match it by text at all
export async function exploreFormAtUrl(page: Page, title: string, url: string): Promise<ExplorationRun> {
  await page.goto(url);
  await page.waitForURL(/\/forms\/\d+/);
  return runExploration(page, title);
}

// shared by every single-form explore-*.spec.ts: logs in, opens the
// named referral type's form, runs it through the generic engine, and
// writes the report. a dedicated wizard page object isn't needed here
// the way the hand-written suites use one - the engine only ever needs
// the form's URL to have loaded, not any form-specific knowledge of its
// steps or fields
export async function exploreReferralForm(page: Page, serviceType: string): Promise<ExplorationRun> {
  await loginAndGoToDashboard(page);
  return exploreOpenForm(page, serviceType);
}
