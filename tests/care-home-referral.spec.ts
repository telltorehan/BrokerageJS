import { expect, Page, test } from '@playwright/test';
import { DashboardPage } from '../src/pages/DashboardPage';
import { LoginPage } from '../src/pages/LoginPage';
import { CareHomeWizard } from '../src/pages/CareHomeWizard';
import { buildCareHomeData, CareHomeData } from '../src/data/careHomeData';

const email = process.env.BROKERAGE_EMAIL ?? '';
const password = process.env.BROKERAGE_PASSWORD ?? '';

async function openCareHomeWizard(page: Page): Promise<CareHomeWizard> {
  const login = new LoginPage(page);
  await login.goto();
  await login.login(email, password);

  const dashboard = new DashboardPage(page);
  await dashboard.waitForLoaded();

  const modal = await dashboard.startNewReferral();
  await modal.choose('Care Within the Home');

  const wizard = new CareHomeWizard(page);
  await wizard.waitForLoaded();
  return wizard;
}

async function fillWizardThroughSummary(wizard: CareHomeWizard, data: CareHomeData): Promise<void> {
  await wizard.completeIntro();
  await wizard.completeServiceLevel(data.serviceLevel);
  await wizard.completeReferralDetails(data);
  await wizard.completeNhsAndLas(data);
  await wizard.completeHospitalDetails(data);
  await wizard.completeClientDetails(data.client);
  await wizard.completeAddress(data.client);
  await wizard.completeMainCareNeeds(data);
  await wizard.completeAdditionalInfo(data);
  await wizard.completeAlternativeContact(data.alternativeContact);
}

test.beforeEach(() => {
  expect(email, 'BROKERAGE_EMAIL is not set').not.toBe('');
  expect(password, 'BROKERAGE_PASSWORD is not set').not.toBe('');
});

test.describe('care within the home referral submission', () => {
  // this test writes a real referral, a retry would create a duplicate
  test.describe.configure({ retries: 0 });

  test('creates a care within the home referral end to end', async ({ page }) => {
    const data = buildCareHomeData();
    const wizard = await openCareHomeWizard(page);
    await fillWizardThroughSummary(wizard, data);

    await expect(wizard.summaryHeading).toBeVisible();

    await wizard.submit();
    await wizard.returnToDashboard();

    const dashboard = new DashboardPage(page);
    await dashboard.waitForLoaded();
    await expect(dashboard.pageIndicator).toBeVisible();
  });
});

test('fills the care within the home wizard without submitting', async ({ page }) => {
  const data = buildCareHomeData();
  const wizard = await openCareHomeWizard(page);
  await fillWizardThroughSummary(wizard, data);

  await expect(wizard.summaryHeading).toBeVisible();
  await expect(wizard.submitButton).toBeVisible();
});
