import { expect, test } from '@playwright/test';
import { exploreReferralForm } from './support/exploreForm';

const email = process.env.BROKERAGE_EMAIL ?? '';
const password = process.env.BROKERAGE_PASSWORD ?? '';

test.beforeEach(() => {
  expect(email, 'BROKERAGE_EMAIL is not set').not.toBe('');
  expect(password, 'BROKERAGE_PASSWORD is not set').not.toBe('');
});

test('explores the nursing form and reports what it finds', async ({ page }) => {
  test.setTimeout(240_000);
  const { report, file } = await exploreReferralForm(page, 'Nursing');
  expect(report.reachedSummary, `Exploration did not reach Summary - see ${file}`).toBe(true);
});
