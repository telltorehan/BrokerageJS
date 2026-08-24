import { Page } from '@playwright/test';

export class LoginPage {
  constructor(private readonly page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto('/login');
  }

  async login(email: string, password: string): Promise<void> {
    await this.page.locator('#Email').fill(email);
    await this.page.locator('#Password').fill(password);
    await this.page.locator('#Password').press('Enter');
  }
}
