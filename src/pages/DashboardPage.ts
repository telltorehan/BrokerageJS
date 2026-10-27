import { Locator, Page } from '@playwright/test';
import { NewReferralModal } from './NewReferralModal';

export class DashboardPage {
  constructor(private readonly page: Page) {}

  get pageIndicator(): Locator {
    // .new_referral is a stable cross-environment marker, confirmed from
    // two environments' real dashboard markup: this one renders it as a
    // <div class="brokerage-block ... new_referral"> card, Richmond &
    // Wandsworth's is a plain <a class="btn btn-success new_referral">
    // in a different layout position entirely - different tag, different
    // surrounding classes, different placement, same marker class. it's
    // clearly how the platform itself tags "this opens the new-referral
    // modal", not incidental styling, so it should hold across any
    // environment built on the same platform. far more durable than the
    // text-matching this used before, which also differs per environment
    // (this card has a "Create a new referral record" subtitle, Richmond
    // & Wandsworth's button has no subtitle at all)
    return this.page.locator('.new_referral').first();
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
