import { expect, test } from '@playwright/test';
import { DashboardPage } from '../src/pages/DashboardPage';
import { exploreOpenForm, loginAndGoToDashboard } from './support/exploreForm';

const email = process.env.BROKERAGE_EMAIL ?? '';
const password = process.env.BROKERAGE_PASSWORD ?? '';

test.beforeEach(() => {
  expect(email, 'BROKERAGE_EMAIL is not set').not.toBe('');
  expect(password, 'BROKERAGE_PASSWORD is not set').not.toBe('');
});

// doesn't hardcode which forms exist. it reads whatever the "start a
// new referral" modal currently offers and explores every one of them
// in sequence, so a form added to this environment at any point - today,
// next week, whenever - needs no new test file: the next run picks it
// up automatically
test('explores every referral form currently offered by this environment', async ({ page }) => {
  // a run that walks every form in the environment back-to-back needs a
  // much larger budget than any single form - this scales with however
  // many forms exist today, not a number fixed in advance
  test.setTimeout(30 * 60 * 1000);

  await loginAndGoToDashboard(page);

  const dashboard = new DashboardPage(page);
  const modal = await dashboard.startNewReferral();
  const formNames = await modal.listServiceTypes();
  await modal.close();

  console.log(`Discovered ${formNames.length} referral form(s): ${formNames.join(', ')}`);
  expect(formNames.length, 'No referral forms were discovered in the "start a new referral" modal').toBeGreaterThan(0);

  const results: { form: string; reachedSummary: boolean }[] = [];

  for (const formName of formNames) {
    console.log(`\n=== Exploring "${formName}" ===`);
    const { report } = await exploreOpenForm(page, formName);
    results.push({ form: formName, reachedSummary: report.reachedSummary });

    // back to a clean dashboard before opening the next form - the
    // engine never submits, so there's nothing to undo, just navigate
    await dashboard.open();
  }

  console.log('\n=== Summary ===');
  for (const result of results) {
    console.log(`  ${result.reachedSummary ? 'OK' : 'FAILED'} - ${result.form}`);
  }

  for (const result of results) {
    expect.soft(result.reachedSummary, `${result.form} did not reach Summary`).toBe(true);
  }
});
