import { expect, test } from '@playwright/test';
import { DashboardPage } from '../src/pages/DashboardPage';
import { LoginPage } from '../src/pages/LoginPage';

const email = process.env.BROKERAGE_EMAIL ?? '';
const password = process.env.BROKERAGE_PASSWORD ?? '';

test.beforeEach(() => {
  expect(email, 'BROKERAGE_EMAIL is not set').not.toBe('');
  expect(password, 'BROKERAGE_PASSWORD is not set').not.toBe('');
});

// a one-off diagnostic, not a pass/fail check: dumps the dashboard's own
// markup (not the modal) so the "start a new referral" control can be
// compared against another environment's real HTML. Richmond &
// Wandsworth's is an <a class="btn btn-success new_referral"> in a
// different layout position - this checks whether this environment uses
// the same "new_referral" class (a genuine structural marker) or
// something else entirely, before building a cross-environment selector
test('dumps the dashboard markup to compare the new-referral control across environments', async ({ page }) => {
  const login = new LoginPage(page);
  await login.goto();
  await login.login(email, password);

  const dashboard = new DashboardPage(page);
  await dashboard.waitForLoaded();

  const html = await page.locator('body').innerHTML();
  console.log('Dashboard body HTML:');
  console.log(html);
});
