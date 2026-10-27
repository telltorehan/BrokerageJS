import { Locator, Page } from '@playwright/test';
import { NewReferralModal } from './NewReferralModal';

export class DashboardPage {
  constructor(private readonly page: Page) {}

  get pageIndicator(): Locator {
    // "New referral" only ever matched uniquely by coincidence - it's a
    // substring of this card's own "Create a new referral record" text.
    // every earlier flow opened the modal once and then navigated away
    // (choose() loads a new URL), so there was never a second "New
    // referral" to collide with. the multi-form discovery flow closes
    // the modal without navigating (just to read its tile list) and
    // reopens it - the closed modal's own <h5>New referral</h5> stays in
    // the DOM hidden, same persistence pattern seen everywhere else in
    // this app, and getByText('New referral') then matches both. scope
    // to text that's specific to this card and never appears in the modal
    return this.page.getByText('Create a new referral record');
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
