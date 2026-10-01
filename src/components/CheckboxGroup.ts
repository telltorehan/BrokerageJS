import { Page } from '@playwright/test';

export class CheckboxGroup {
  constructor(private readonly page: Page) {}

  async check(label: string): Promise<void> {
    await this.page.getByLabel(label, { exact: true }).check();
  }

  async checkAll(labels: string[]): Promise<void> {
    for (const label of labels) {
      await this.check(label);
    }
  }
}
