import { expect, Locator, Page } from '@playwright/test';

export class NewReferralModal {
  private readonly root: Locator;

  constructor(page: Page) {
    this.root = page.locator('#generalModal');
  }

  async waitForOpen(): Promise<void> {
    await expect(this.root).toBeVisible();
  }

  async chooseResidential(): Promise<void> {
    // the dashboard table behind the modal also contains the word
    // "Residential", so this has to stay scoped to the modal root. the
    // tile's own text runs "ResidentialPlease use this..." as one node,
    // so it can't be an exact match either
    await this.root.getByText('Residential').click();
    await expect(this.root).toBeHidden();
  }
}
