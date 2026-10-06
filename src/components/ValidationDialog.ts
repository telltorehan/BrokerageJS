import { expect, Page } from '@playwright/test';

// clicking "Next" with a required field left blank opens a "Problem"
// dialog naming every missing field on the current page and blocks
// navigation until it's dismissed. Asserting on this is how we verify the
// app's own required-field validation actually works, not just that our
// automation fills fields correctly.
export class ValidationDialog {
  constructor(private readonly page: Page) {}

  async expectMissingField(fieldName: string): Promise<void> {
    const dialog = this.page.getByRole('dialog').filter({ hasText: 'Problem' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(fieldName, { exact: true })).toBeVisible();
    await dialog.getByRole('button', { name: 'Close' }).first().click();
    await expect(dialog).toBeHidden();
  }
}
