import { Locator, Page } from '@playwright/test';
import { NewReferralModal } from './NewReferralModal';

export class DashboardPage {
  private dashboardUrl: string | null = null;

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
    // confirmed from a real run: the dashboard's own route differs per
    // environment (this one: /ReferralHome, Richmond & Wandsworth:
    // /BrokerHome) - rather than guess or hardcode either, navigate back
    // to whatever URL we actually landed on last time waitForLoaded()
    // ran. before that's ever happened, '/' is the one page any
    // environment should redirect an authenticated session from
    await this.page.goto(this.dashboardUrl ?? '/');
    await this.waitForLoaded();
  }

  async waitForLoaded(): Promise<void> {
    // don't assert a specific URL pattern here - that's exactly what
    // broke on Richmond & Wandsworth. the new-referral marker is the one
    // thing confirmed to hold across environments, so wait on that
    // instead, and remember wherever it is we ended up for open() to
    // reuse later
    await this.pageIndicator.waitFor({ state: 'visible' });
    this.dashboardUrl = this.page.url();
  }

  async startNewReferral(): Promise<NewReferralModal> {
    await this.pageIndicator.click();
    const modal = new NewReferralModal(this.page);

    try {
      await modal.waitForOpen(5000);
    } catch {
      // a real run saw #generalModal never open at all after this click
      // - the very first click of the whole run, right after the
      // dashboard loads. fits the same "clicked before the JS handler
      // was wired up" race seen elsewhere on freshly-loaded widgets. a
      // second click, now that the page has had more time to settle,
      // resolves it
      await this.pageIndicator.click();
      await modal.waitForOpen();
    }

    return modal;
  }
}
