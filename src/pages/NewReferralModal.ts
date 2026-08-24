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
    // "Residential", so this has to stay scoped to the modal root
    await this.root.getByText('Residential', { exact: true }).click();
    await expect(this.root).toBeHidden();
  }
}
