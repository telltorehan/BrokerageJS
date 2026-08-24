import { expect, Page, test } from '@playwright/test';
import { DashboardPage } from '../src/pages/DashboardPage';
import { LoginPage } from '../src/pages/LoginPage';
import { ReferralWizard } from '../src/pages/ReferralWizard';
import { buildReferralData, ReferralData } from '../src/data/referralData';

const email = process.env.BROKERAGE_EMAIL ?? '';
const password = process.env.BROKERAGE_PASSWORD ?? '';

async function openResidentialWizard(page: Page): Promise<ReferralWizard> {
  const login = new LoginPage(page);
  await login.goto();
  await login.login(email, password);

  const dashboard = new DashboardPage(page);
  await dashboard.waitForLoaded();

  const modal = await dashboard.startNewReferral();
  await modal.chooseResidential();

  const wizard = new ReferralWizard(page);
  await wizard.waitForLoaded();
  return wizard;
}

async function fillWizardThroughSummary(wizard: ReferralWizard, data: ReferralData): Promise<void> {
  await wizard.completeIntro();
  await wizard.completeServiceLevel(data.serviceLevel);
  await wizard.completePackageRequirements(data);
  await wizard.completeClientDetails(data.client);
  await wizard.completeNhsAndLas(data);
  await wizard.completeCareHomeDetails(data);
  await wizard.completeMainCareNeeds(data);
  await wizard.completeOtherInfo(data.otherInformation);
  await wizard.completeInternalNotes(data.internalNotes);
  await wizard.completeAlternativeContact(data.alternativeContact);
}

test.beforeEach(() => {
  expect(email, 'BROKERAGE_EMAIL is not set').not.toBe('');
  expect(password, 'BROKERAGE_PASSWORD is not set').not.toBe('');
});

test.describe('residential referral submission', () => {
  // this test writes a real referral, a retry would create a duplicate
  test.describe.configure({ retries: 0 });

  test('creates a residential referral end to end', async ({ page }) => {
    const data = buildReferralData();
    const wizard = await openResidentialWizard(page);
    await fillWizardThroughSummary(wizard, data);

    await expect(wizard.summaryHeading).toBeVisible();

    await wizard.submit();
    await wizard.returnToDashboard();

    const dashboard = new DashboardPage(page);
    await dashboard.waitForLoaded();
    await expect(dashboard.pageIndicator).toBeVisible();
  });
});

test('fills the residential referral wizard without submitting', async ({ page }) => {
  const data = buildReferralData();
  const wizard = await openResidentialWizard(page);
  await fillWizardThroughSummary(wizard, data);

  await expect(wizard.summaryHeading).toBeVisible();
  await expect(wizard.submitButton).toBeVisible();
});
