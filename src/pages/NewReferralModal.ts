import { expect, Locator, Page } from '@playwright/test';

export class NewReferralModal {
  private readonly root: Locator;

  constructor(page: Page) {
    this.root = page.locator('#generalModal');
  }

  async waitForOpen(timeout?: number): Promise<void> {
    await expect(this.root).toBeVisible(timeout ? { timeout } : undefined);
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

  // every referral type currently offered, with the form's own URL - read
  // from the modal's real markup instead of its rendered text. each tile
  // is a .brokerage-block[data-url] element (confirmed from the modal's
  // actual HTML); the title is .brokerage-block-inner's own text with
  // its nested .small description removed. this is immune to wording
  // changes entirely, unlike the earlier text-parsing approach, which
  // broke once already on a tile with no description line and would
  // break again on one with differently-worded text. the data-url also
  // means a form can be opened by navigating straight to it, without
  // needing to find and click the right tile by its label at all
  async listForms(): Promise<{ title: string; url: string }[]> {
    return this.root.locator('.brokerage-block[data-url]').evaluateAll((blocks) =>
      blocks.map((block) => {
        const url = block.getAttribute('data-url') ?? '';
        const inner = block.querySelector('.brokerage-block-inner');
        const clone = inner?.cloneNode(true) as HTMLElement | undefined;
        clone?.querySelectorAll('.small').forEach((el) => el.remove());
        return { title: (clone?.textContent ?? '').trim(), url };
      }),
    );
  }

  async close(): Promise<void> {
    await this.root.getByRole('button', { name: 'Close' }).first().click();
    await expect(this.root).toBeHidden();
  }
}
