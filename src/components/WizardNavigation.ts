import { Page } from '@playwright/test';

// clicking "Next" with a required field left blank opens a "Problem"
// dialog naming every missing field on the current page and blocks
// navigation until it's dismissed. Checking for it on every single
// "Next" click - rather than writing a one-off check per field - means
// any required field our fill logic misses surfaces immediately as a
// clear, correctly-diagnosed error, in any step of any form, instead of
// a confusing timeout on some unrelated field further down the page.
export class WizardNavigation {
  constructor(private readonly page: Page) {}

  async next(): Promise<void> {
    await this.page.getByText('Next', { exact: true }).click();

    const dialog = this.page.getByRole('dialog').filter({ hasText: 'Problem' });
    const blocked = await dialog
      .waitFor({ state: 'visible', timeout: 2000 })
      .then(() => true)
      .catch(() => false);

    if (!blocked) {
      return;
    }

    const missing = await dialog.locator('li').allTextContents();
    await dialog.getByRole('button', { name: 'Close' }).first().click();
    throw new Error(`Required field(s) not filled: ${missing.join(', ')}`);
  }
}
