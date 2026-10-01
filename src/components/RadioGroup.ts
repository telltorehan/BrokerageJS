import { Page } from '@playwright/test';

export class RadioGroup {
  constructor(private readonly page: Page) {}

  async choose(label: string, exact = true): Promise<void> {
    await this.page.getByLabel(label, { exact }).check();
  }

  // some forms keep every step's fields in the DOM at once (hidden rather
  // than removed), so a reused option label like "Male" or "Yes" can
  // match more than one unrelated question at a time. scope to the
  // specific field's own group when that happens, same approach
  // SearchableDropdown uses for its label lookup
  async chooseWithinGroup(groupLabel: string, optionLabel: string, exact = true): Promise<void> {
    const group = this.page
      .locator('.form-group')
      .filter({ has: this.page.locator('label', { hasText: groupLabel }) })
      .first();
    await group.getByLabel(optionLabel, { exact }).check();
  }
}
