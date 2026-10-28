import { expect, test } from '@playwright/test';
import { ExplorationReport } from '../src/components/FormExplorer';
import { exploreFormAtUrl, loginAndGoToDashboard } from './support/exploreForm';
import { renderSummaryHtml } from './support/renderReportHtml';

const email = process.env.BROKERAGE_EMAIL ?? '';
const password = process.env.BROKERAGE_PASSWORD ?? '';

test.beforeEach(() => {
  expect(email, 'BROKERAGE_EMAIL is not set').not.toBe('');
  expect(password, 'BROKERAGE_PASSWORD is not set').not.toBe('');
});

// doesn't hardcode which forms exist. it reads whatever the "start a
// new referral" modal currently offers (title and URL, straight from
// the modal's own markup) and explores every one of them in sequence,
// so a form added to this environment at any point - today, next week,
// whenever - needs no new test file: the next run picks it up
// automatically
test('explores every referral form currently offered by this environment', async ({ page }) => {
  // a run that walks every form in the environment back-to-back needs a
  // much larger budget than any single form - this scales with however
  // many forms exist today, not a number fixed in advance
  test.setTimeout(30 * 60 * 1000);

  // reuse the same DashboardPage instance throughout - it remembers the
  // real dashboard URL once waitForLoaded() runs, which open() below
  // relies on instead of guessing a route that differs per environment
  const dashboard = await loginAndGoToDashboard(page);
  const modal = await dashboard.startNewReferral();
  const forms = await modal.listForms();
  await modal.close();

  console.log(`Discovered ${forms.length} referral form(s): ${forms.map((f) => f.title).join(', ')}`);
  expect(forms.length, 'No referral forms were discovered in the "start a new referral" modal').toBeGreaterThan(0);

  const runs: { title: string; report: ExplorationReport }[] = [];

  for (const form of forms) {
    console.log(`\n=== Exploring "${form.title}" (${form.url}) ===`);
    const { report } = await exploreFormAtUrl(page, form.title, form.url);
    runs.push({ title: form.title, report });

    // back to a clean dashboard before opening the next form - the
    // engine never submits, so there's nothing to undo, just navigate
    await dashboard.open();
  }

  console.log('\n=== Summary ===');
  for (const run of runs) {
    console.log(`  ${run.report.reachedSummary ? 'OK' : 'FAILED'} - ${run.title}`);
  }

  // one structured, tick/cross overview of the whole run, instead of
  // piecing it together from the console log and a separate flat
  // attachment per form - each form's own attachment was already added
  // as it finished, so this one lands last in the list, but it's the
  // only one you actually need to open first to see what passed
  await test.info().attach('exploration-summary.html', { body: renderSummaryHtml(runs), contentType: 'text/html' });

  for (const run of runs) {
    expect.soft(run.report.reachedSummary, `${run.title} did not reach Summary`).toBe(true);
  }
});
