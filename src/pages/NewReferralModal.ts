import { expect, Locator, Page } from '@playwright/test';

export class NewReferralModal {
  private readonly root: Locator;

  constructor(page: Page) {
    this.root = page.locator('#generalModal');
  }

  async waitForOpen(): Promise<void> {
    await expect(this.root).toBeVisible();
  }

  async choose(serviceType: string): Promise<void> {
    // the dashboard table behind the modal can contain the same words as a
    // tile's name, so this has to stay scoped to the modal root. each
    // tile's own text runs together with its description as one node
    // (e.g. "ResidentialPlease use this...", "Care Within the HomePlease
    // ..."), so this can't be an exact match either
    await this.root.getByText(serviceType).click();
    await expect(this.root).toBeHidden();
  }
}
