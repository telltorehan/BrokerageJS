import { Page } from '@playwright/test';

export class RadioGroup {
  constructor(private readonly page: Page) {}

  async choose(label: string, exact = true): Promise<void> {
    await this.page.getByLabel(label, { exact }).check();
  }

  // some pages have more than one Yes/No (or other shared-text) question
  // visible at once, so a plain label lookup can match the wrong group -
  // scope to the specific field's own group when that happens
  async chooseWithinGroup(groupLabel: string, optionLabel: string, exact = true): Promise<void> {
    const group = this.page
      .locator('.form-group')
      .filter({ has: this.page.locator('label', { hasText: groupLabel }) })
      .first();
    await group.getByLabel(optionLabel, { exact }).check();
  }
}
