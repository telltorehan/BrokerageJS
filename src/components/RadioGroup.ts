import { Page } from '@playwright/test';

export class RadioGroup {
  constructor(private readonly page: Page) {}

  async choose(label: string, exact = true): Promise<void> {
    await this.page.getByLabel(label, { exact }).check();
  }
}
