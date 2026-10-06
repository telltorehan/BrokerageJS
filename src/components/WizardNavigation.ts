import { Locator, Page } from '@playwright/test';

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
    // the dialog usually never appears - that's the success case on
    // nearly every call. waitFor()'s own timeout would report as a failed
    // step in the trace/report even though we catch it, making a fully
    // passing run look like it has errors everywhere. polling isVisible()
    // (which never throws) avoids that noise entirely
    const blocked = await this.pollUntilVisible(dialog, 2000);

    if (!blocked) {
      return;
    }

    const missing = await dialog.locator('li').allTextContents();
    await dialog.getByRole('button', { name: 'Close' }).first().click();
    throw new Error(`Required field(s) not filled: ${missing.join(', ')}`);
  }

  private async pollUntilVisible(dialog: Locator, timeoutMs: number): Promise<boolean> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if (await dialog.isVisible()) {
        return true;
      }
      await this.page.waitForTimeout(100);
    }
    return dialog.isVisible();
  }
}
