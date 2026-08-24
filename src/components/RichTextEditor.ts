import { FrameLocator, Page } from '@playwright/test';

export class RichTextEditor {
  private readonly frame: FrameLocator;

  constructor(page: Page, iframeSelector: string) {
    this.frame = page.frameLocator(iframeSelector);
  }

  async fill(text: string): Promise<void> {
    const body = this.frame.getByRole('textbox', { name: 'Rich Text Area' });
    await body.click();
    await body.fill(text);
  }
}
