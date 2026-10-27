import { expect, Locator, Page } from '@playwright/test';

export class NewReferralModal {
  private readonly root: Locator;

  constructor(page: Page) {
    this.root = page.locator('#generalModal');
  }

  async waitForOpen(): Promise<void> {
    await expect(this.root).toBeVisible();
  }

  async choose(serviceType: string): Promise<void> {
    // the dashboard table behind the modal can contain the same words as a
    // tile's name, so this has to stay scoped to the modal root. each
    // tile's own text runs together with its description as one node
    // (e.g. "ResidentialPlease use this...", "Care Within the HomePlease
    // ..."), so this can't be an exact match either
    await this.root.getByText(serviceType).click();
    await expect(this.root).toBeHidden();
  }

  // every referral type currently offered, read straight from the
  // modal's own text rather than a hardcoded list - so a form added to
  // this environment later is picked up automatically on the next run.
  // the tiles themselves have no accessible role to select by (confirmed
  // from a real run: a role-based selector only matched the close
  // controls). most tiles' titles are followed by their own "Please use
  // this form for a ... referral" description line, but that's not
  // guaranteed - a real tile ("RBC Care at Home Referral Draft
  // Template") has no description line at all, straight into "Close",
  // and pairing on that assumption silently dropped it. filtering out
  // the known non-title lines (the header, the icons, any description
  // line) instead of requiring a description's presence handles both
  // shapes
  async listServiceTypes(): Promise<string[]> {
    const raw = await this.root.innerText();
    const lines = raw
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const nonTitleLines = new Set(['New referral', '×', 'Close']);
    return lines.filter((line) => !nonTitleLines.has(line) && !/^please use this form for/i.test(line));
  }

  async close(): Promise<void> {
    await this.root.getByRole('button', { name: 'Close' }).first().click();
    await expect(this.root).toBeHidden();
  }
}
