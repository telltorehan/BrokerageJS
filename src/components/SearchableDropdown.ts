import { faker } from '@faker-js/faker';
import { Locator, Page } from '@playwright/test';

function escapeForRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function clickOptionPastToast(page: Page, option: Locator, timeout: number): Promise<void> {
  try {
    await option.click({ timeout });
  } catch (error) {
    // a notification toast has been seen sitting on screen long enough
    // to outlast even a 10s wait (confirmed on a real run) - we aren't
    // testing the toast, so rather than waiting indefinitely for
    // something that might not disappear in any fixed time, clear it
    // directly and retry once
    const toastStillBlocking = await page.locator('#global_toast').isVisible().catch(() => false);
    if (!toastStillBlocking) {
      throw error;
    }
    await page.evaluate(() => {
      const toast = document.getElementById('global_toast');
      if (toast) {
        toast.style.display = 'none';
      }
    });
    await option.click({ timeout: 5000 });
  }
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
    // associate them with directly (no for/id, no aria-labelledby).
    // some forms keep every step's fields mounted at once, so the same
    // label (e.g. "Select the hospital team") can exist more than once -
    // only the currently visible group is ever the one we want. a
    // dropdown's field label can also collide with unrelated radio option
    // text on the same page (e.g. a "Locality team" dropdown next to a
    // "Locality team" radio choice), so the matched group must actually
    // contain a combobox toggle, not just the label text
    const field = page
      .locator('.form-group:visible')
      .filter({ has: page.locator('label', { hasText: label }) })
      .filter({ has: page.locator('button[role="combobox"]') })
      .first();

    return new SearchableDropdown(page, field.locator('button[role="combobox"]'));
  }

  static byDataId(page: Page, dataId: string): SearchableDropdown {
    return new SearchableDropdown(page, page.locator(`button[role="combobox"][data-id="${dataId}"]`));
  }

  // wraps a toggle handle the caller already scoped uniquely (e.g. from
  // scanning one specific .form-group), bypassing the page-wide label
  // search entirely - used by the exploration engine, where every field
  // is already a concrete handle rather than something to re-find by text
  static fromToggle(page: Page, toggle: Locator): SearchableDropdown {
    return new SearchableDropdown(page, toggle);
  }

  // reads the real option list and picks one in a single open/close
  // cycle, for callers that don't know the right value ahead of time
  // (the exploration engine) - opening the menu twice (once to read,
  // once to click) doubled every dropdown's interaction time for no
  // benefit, which matters a lot once a form has 15-20 dropdowns
  async selectRandom(): Promise<string | undefined> {
    await this.toggle.first().scrollIntoViewIfNeeded();
    await this.toggle.first().click();
    const optionLocator = this.page.locator('a[role="option"]:visible');

    // a dropdown revealed by an earlier answer can still find zero
    // options even after polling for them - raising the poll timeout to
    // 3s didn't fix a real recurrence of this, which points to the click
    // itself not having opened the menu at all (clicked a moment too
    // early, before the widget's own handler was wired up after being
    // revealed) rather than the options merely loading slowly. polling
    // alone can't recover from that, since nothing re-opens the menu - a
    // second click, now that more time has passed, does
    let real = await this.pollForRealOptions(optionLocator, 1500);
    if (real.length === 0) {
      await this.toggle.first().click();
      real = await this.pollForRealOptions(optionLocator, 1500);
    }

    if (real.length === 0) {
      await this.page.keyboard.press('Escape');
      return undefined;
    }

    const picked = faker.helpers.arrayElement(real);
    const option = optionLocator.filter({ hasText: new RegExp(`^${escapeForRegExp(picked)}$`) }).first();
    await clickOptionPastToast(this.page, option, 10000);
    await this.page.keyboard.press('Escape');
    return picked;
  }

  private async pollForRealOptions(optionLocator: Locator, timeoutMs: number): Promise<string[]> {
    const deadline = Date.now() + timeoutMs;
    let real: string[] = [];
    do {
      const texts = (await optionLocator.allTextContents()).map((text) => text.trim()).filter((text) => text.length > 0);
      real = texts.filter((text) => !/^-?\s*(please )?select\s*-?$/i.test(text));
      if (real.length > 0) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    } while (Date.now() < deadline);
    return real;
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
    // always uses actual <option> tags - anchor on the tag instead.
    // several dropdowns share option text (e.g. "Other - please detail in
    // comments box below"), and bootstrap-select leaves closed menus in
    // the DOM rather than removing them, so :visible is needed too - only
    // the menu we just opened is ever visible, since every prior select()
    // closed its own menu with Escape before returning. a short timeout
    // means a typo'd option name fails fast rather than burning the whole
    // test timeout on a click that can never resolve
    // some dropdowns in this app genuinely have two options with identical
    // text (e.g. the "Care Home" list has "Test" listed twice) - take the
    // first match deterministically instead of a strict-mode violation
    const option = this.page
      .locator('a[role="option"]:visible')
      .filter({ hasText: new RegExp(`^${escapeForRegExp(optionText)}$`) })
      .first();
    await clickOptionPastToast(this.page, option, 10000);
    // the open menu sits on top of whatever field comes next, close it
    // explicitly rather than relying on the click having done that
    await this.page.keyboard.press('Escape');
  }
}
