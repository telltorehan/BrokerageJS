import { FrameLocator, Page } from '@playwright/test';

export class RichTextEditor {
  private readonly frame: FrameLocator;

  constructor(page: Page, iframeSelector: string) {
    this.frame = page.frameLocator(iframeSelector);
  }

  async fill(text: string): Promise<void> {
    // the editable body is a plain contenteditable div with an aria-label,
    // not something exposing role="textbox" - match on the label directly
    const body = this.frame.getByLabel('Rich Text Area');
    await body.click();
    await body.fill(text);
  }
}
