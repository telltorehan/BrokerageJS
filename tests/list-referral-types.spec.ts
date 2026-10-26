import { expect, test } from '@playwright/test';
import { DashboardPage } from '../src/pages/DashboardPage';
import { LoginPage } from '../src/pages/LoginPage';

const email = process.env.BROKERAGE_EMAIL ?? '';
const password = process.env.BROKERAGE_PASSWORD ?? '';

test.beforeEach(() => {
  expect(email, 'BROKERAGE_EMAIL is not set').not.toBe('');
  expect(password, 'BROKERAGE_PASSWORD is not set').not.toBe('');
});

// a one-off diagnostic, not a pass/fail check: prints every referral type
// tile's exact text so new explore-*.spec.ts files can be pointed at
// modal.choose(...) with the real text instead of a guessed one - also
// useful later if another environment's modal lists different services
test('lists every referral type offered by the new-referral modal', async ({ page }) => {
  const login = new LoginPage(page);
  await login.goto();
  await login.login(email, password);

  const dashboard = new DashboardPage(page);
  await dashboard.waitForLoaded();
  await dashboard.startNewReferral();

  const tiles = page.locator('#generalModal').getByRole('link').or(page.locator('#generalModal').getByRole('button'));
  const count = await tiles.count();
  console.log(`Found ${count} referral type tile(s):`);
  for (let i = 0; i < count; i += 1) {
    const text = (await tiles.nth(i).textContent())?.trim().replace(/\s+/g, ' ');
    console.log(`  [${i}] ${text}`);
  }

  await expect(page.locator('#generalModal')).toBeVisible();
});
