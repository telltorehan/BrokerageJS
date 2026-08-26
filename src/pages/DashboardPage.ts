import { Locator, Page } from '@playwright/test';
import { NewReferralModal } from './NewReferralModal';

export class DashboardPage {
  constructor(private readonly page: Page) {}

  get pageIndicator(): Locator {
    // the card's accessible text is "New referral Create a new..." as one
    // run, so an exact match here never resolves
    return this.page.getByText('New referral');
  }

  async open(): Promise<void> {
    await this.page.goto('/ReferralHome');
    await this.waitForLoaded();
  }

  async waitForLoaded(): Promise<void> {
    // app serves /ReferralHome but redirects to /referralhome after
    // navigating back from the wizard, match case-insensitively
    await this.page.waitForURL(/\/referralhome/i);
    await this.pageIndicator.waitFor({ state: 'visible' });
  }

  async startNewReferral(): Promise<NewReferralModal> {
    await this.pageIndicator.click();
    const modal = new NewReferralModal(this.page);
    await modal.waitForOpen();
    return modal;
  }
}
