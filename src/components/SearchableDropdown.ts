import { Locator, Page } from '@playwright/test';

function escapeForRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Driver for the bootstrap-select widgets used throughout the wizard.
 * Option ids (#bs-select-9-3 etc) shift depending on how many items are in
 * the list, so we always resolve options by their visible text instead.
 */
export class SearchableDropdown {
  private constructor(private readonly page: Page, private readonly toggle: Locator) {}

  static byLabel(page: Page, label: string): SearchableDropdown {
    // label and toggle live in the same form-group, there's nothing to
    // associate them with directly (no for/id, no aria-labelledby)
    const field = page
      .locator('.form-group')
      .filter({ has: page.locator('label', { hasText: label }) })
      .first();

    return new SearchableDropdown(page, field.locator('button[role="combobox"]'));
  }

  static byDataId(page: Page, dataId: string): SearchableDropdown {
    return new SearchableDropdown(page, page.locator(`button[role="combobox"][data-id="${dataId}"]`));
  }

  async isPresent(timeout = 1000): Promise<boolean> {
    try {
      await this.toggle.first().waitFor({ state: 'attached', timeout });
      return true;
    } catch {
      return false;
    }
  }

  async select(optionText: string): Promise<void> {
    await this.toggle.first().scrollIntoViewIfNeeded();
    await this.toggle.first().click();
    // the native <select> underneath is exposed in the accessibility tree
    // as either a combobox (single-select) or a listbox (multi-select),
    // so scoping by role alone isn't reliable either way. the real widget
    // always renders its choices as <a role="option">, the native select
    // always uses actual <option> tags - anchor on the tag instead, and a
    // short timeout means a typo'd option name fails fast rather than
    // burning the whole test timeout on a click that can never resolve
    await this.page
      .locator('a[role="option"]')
      .filter({ hasText: new RegExp(`^${escapeForRegExp(optionText)}$`) })
      .click({ timeout: 5000 });
    // the open menu sits on top of whatever field comes next, close it
    // explicitly rather than relying on the click having done that
    await this.page.keyboard.press('Escape');
  }
}
