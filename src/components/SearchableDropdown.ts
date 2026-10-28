import { faker } from '@faker-js/faker';
import { Locator, Page } from '@playwright/test';

function escapeForRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function hideBlockingToasts(page: Page): Promise<void> {
  // a real dashboard dump showed THREE separate elements with
  // id="global_toast" at once - this app creates a new one (likely per
  // autosave cycle) rather than reusing one, so document.getElementById
  // only ever hides whichever one happens to be first in the DOM, which
  // may not be the one actually covering the click. querySelectorAll
  // catches all of them regardless of how many exist at once
  await page.evaluate(() => {
    document.querySelectorAll('#global_toast, .toast').forEach((el) => {
      (el as HTMLElement).style.display = 'none';
    });
  });
}

async function clickOptionPastToast(page: Page, getOption: () => Locator, timeout: number, reopen: () => Promise<void>): Promise<void> {
  try {
    await getOption().click({ timeout });
    return;
  } catch {
    // fall through to the retry loop below
  }

  // a single hide-and-retry wasn't enough on a real run - the retry
  // itself timed out too, which fits a toast reappearing right after
  // being hidden (the app seems to fire autosave toasts repeatedly in
  // quick succession) rather than there being just one to clear. keep
  // hiding and retrying for a few seconds instead of giving up after
  // one attempt - we aren't testing the toast, so clearing it as many
  // times as it takes is fine
  const deadline = Date.now() + 8000;
  let lastError: unknown;
  while (Date.now() < deadline) {
    await hideBlockingToasts(page);

    // a real run showed a failure with none of the toast-interception
    // detail Playwright normally logs when something's covering the
    // click - just "couldn't find the option", which fits the dropdown
    // menu itself having closed (possibly a side effect of the retrying
    // above) rather than a toast sitting on top of it. retrying a click
    // on an option that isn't there anymore can never succeed, so
    // reopen the menu first when that's what's actually happened
    const option = getOption();
    if (!(await option.isVisible().catch(() => false))) {
      await reopen();
    }

    try {
      await getOption().click({ timeout: 1500 });
      return;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
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
    const getOption = () => optionLocator.filter({ hasText: new RegExp(`^${escapeForRegExp(picked)}$`) }).first();
    await clickOptionPastToast(this.page, getOption, 10000, async () => {
      await this.toggle.first().click();
    });
    await this.page.keyboard.press('Escape');
    return picked;
  }

  private async pollForRealOptions(optionLocator: Locator, timeoutMs: number): Promise<string[]> {
    const deadline = Date.now() + timeoutMs;
    let real: string[] = [];
    do {
      const texts = (await optionLocator.allTextContents()).map((text) => text.trim()).filter((text) => text.length > 0);
      // different environments write their placeholder differently -
      // "(Please Select)" (parentheses) on one real run, "Nothing
      // selected" (a completely different word) on another - both got
      // treated as real options and picked as the field's value,
      // leaving it effectively unfilled despite looking "successful"
      real = texts.filter(
        (text) => !/^\(?-?\s*(please )?select\s*-?\)?$/i.test(text) && !/^nothing selected$/i.test(text),
      );
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
    const getOption = () =>
      this.page
        .locator('a[role="option"]:visible')
        .filter({ hasText: new RegExp(`^${escapeForRegExp(optionText)}$`) })
        .first();
    await clickOptionPastToast(this.page, getOption, 10000, async () => {
      await this.toggle.first().click();
    });
    // the open menu sits on top of whatever field comes next, close it
    // explicitly rather than relying on the click having done that
    await this.page.keyboard.press('Escape');
  }
}
