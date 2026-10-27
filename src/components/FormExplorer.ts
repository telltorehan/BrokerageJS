// this is a UK app (NHS/LAS terms, UK phone and postcode formats
// elsewhere) - the GB locale gives names, addresses and counties that
// actually look UK-shaped instead of faker's US-flavoured defaults
import { fakerEN_GB as faker } from '@faker-js/faker';
import { Locator, Page, test } from '@playwright/test';
import { RichTextEditor } from './RichTextEditor';
import { SearchableDropdown } from './SearchableDropdown';
import { WizardNavigation } from './WizardNavigation';

export type FieldKind = 'dropdown' | 'radio' | 'checkbox' | 'richtext' | 'text' | 'unknown';

export interface FilledField {
  label: string;
  kind: FieldKind;
  value: string;
  optional: boolean;
  revealed: FilledField[];
}

export interface StepReport {
  stepIndex: number;
  url: string;
  fields: FilledField[];
  outcome: 'advanced' | 'recovered' | 'failed';
  recoveredFields: string[];
  error?: string;
}

export interface ExplorationReport {
  form: string;
  startedAt: string;
  finishedAt: string;
  steps: StepReport[];
  reachedSummary: boolean;
  summary: {
    totalFields: number;
    byKind: Record<FieldKind, number>;
    totalSteps: number;
  };
}

// attempts a normal radio click, and only falls back to a forced one if
// the input is specifically a visibility timeout - some custom radio
// widgets in this app visually hide the real <input> behind a styled
// sibling while the <label> association stays genuine, which check()
// resolves to correctly but can't act on without force. not using force
// by default means a genuinely wrong-element bug still fails loudly
async function checkWithFallback(locator: Locator): Promise<void> {
  // seen live, repeatedly: the first click on one specific radio group
  // fails regardless of which option is picked (confirmed across six
  // runs - a different option failed each time), even forced. patient
  // retrying (up to 5s) didn't resolve it either, which argues against
  // this being a plain "not ready yet" timing race and toward something
  // that needs a specific trigger elsewhere on the page, not just
  // elapsed time - still worth a short patient window in case it is
  // partly timing-related
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    try {
      await locator.check({ timeout: 1000 });
      return;
    } catch {
      // try again
    }
  }

  // a native JS click doesn't go through Playwright's simulated mouse
  // event at all, so it can register with a widget whose own event
  // listeners behave differently under a real vs. simulated click -
  // worth trying as a genuinely different mechanism before forcing
  try {
    await locator.evaluate((el) => (el as HTMLInputElement).click());
    if (await locator.isChecked()) {
      return;
    }
  } catch {
    // fall through to the forced click below
  }

  await locator.check({ force: true });
}

// faker's lorem module is deliberately nonsense placeholder text in any
// locale (lorem ipsum doesn't localise), so free-text fields with no more
// specific guess get a real English phrase from one of these banks
// instead - a report reviewed by a person should read like plausible
// care-referral content, not Latin filler
const CARE_GOALS = [
  'Support the client to maintain independence with daily living tasks.',
  'Help the client re-establish a stable routine after a hospital stay.',
  'Reduce the client’s risk of falls and improve mobility around the home.',
  'Build the client’s confidence to manage medication independently.',
  'Support the client with meal preparation and a balanced diet.',
  'Help the client reconnect with family and the local community.',
  'Monitor the client’s wellbeing and respond early to any change in need.',
];

const CARE_NOTES = [
  'No known allergies at the time of referral.',
  'Family have been informed and are supportive of the plan.',
  'Client prefers morning visits where possible.',
  'Previous care package ended due to a change in circumstances.',
  'Client lives alone and has limited mobility.',
  'The allocated social worker should be kept informed of any changes.',
];

const DURATIONS = ['30 minutes', '45 minutes', '1 hour', '1.5 hours', '2 hours'];

const HOUSE_NAMES = ['The Oaks', 'Rose Cottage', 'Maple House', 'The Old Vicarage', 'Willow Lodge', 'Elm Court'];

const WARD_NAMES = ['Ward 4', 'Ward 7', 'Nightingale Ward', 'Meadow Ward', 'Oak Ward', 'Birch Ward'];

const SHORT_NOTES = ['As needed', 'To be confirmed', 'Ongoing review', 'See notes', 'Standard package', 'No change'];

// picks a plausible value for a plain text/textarea field from its label
// text - reuses the exact formats already confirmed to pass this app's
// own validation (UK phone numbers need a leading zero, etc), rather than
// generic data that's likely to trip format validation unnoticed
function guessTextValue(label: string, isTextarea: boolean): string {
  const l = label.toLowerCase();
  if (l.includes('email')) return faker.internet.email();
  // "contact no" (the previous check) only matches an abbreviated label
  // like "Contact No" - it's not a substring of "contact number" (the
  // "o" after "n" has to be immediately followed by another "o", not
  // "umber"), so a real field labelled "Alternative contact number" fell
  // through to the generic fallback and got a phrase instead of digits
  if (
    l.includes('phone') ||
    l.includes('telephone') ||
    l.includes('tel number') ||
    l.includes('tel no') ||
    l.includes('contact no') ||
    l.includes('contact number') ||
    l.includes('mobile')
  ) {
    return `07${faker.string.numeric(9)}`;
  }
  if (l.includes('nhs number')) return faker.string.numeric(10);
  // "las number" doesn't contain "nhs number"/"phone"/"postcode" etc, so
  // it fell through to the generic phrase fallback (confirmed from a
  // real run: got "No change" and "Ongoing review"). but the negative
  // branch's own field - "Describe why the client does not have an LAS
  // number" - also contains that exact substring and wants an
  // explanation, not a number (confirmed: the first version of this fix
  // put a number in it) - exclude anything phrased as a question
  if (l.includes('las number') && !l.includes('describe') && !l.includes('why')) {
    return faker.string.numeric(8);
  }
  if (l.includes('postcode') || l.includes('post code')) return faker.location.zipCode();
  if (l.includes('house name')) return faker.helpers.arrayElement(HOUSE_NAMES);
  if (l.includes('ward')) return faker.helpers.arrayElement(WARD_NAMES);
  if (l.includes('street') || l.includes('address')) return faker.location.street();
  // "cost" and "location" fell through to the generic phrase fallback
  // for the same reason - neither matched anything more specific
  if (l.includes('cost')) return `£${faker.number.int({ min: 250, max: 1200 })}`;
  if (l.includes('location')) return faker.location.city();
  if (l.includes('town') || l.includes('city')) return faker.location.city();
  if (l.includes('county')) return faker.location.county();
  if (l.includes('duration')) return faker.helpers.arrayElement(DURATIONS);
  if (l.includes('date of birth') || l.includes('dob')) {
    const dob = faker.date.birthdate({ min: 70, max: 95, mode: 'age' });
    return `${String(dob.getDate()).padStart(2, '0')}/${String(dob.getMonth() + 1).padStart(2, '0')}/${dob.getFullYear()}`;
  }
  if (l.includes('date')) {
    const date = faker.date.soon({ days: 14 });
    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
  }
  if (l.includes('first name')) return faker.person.firstName();
  if (l.includes('last name') || l.includes('surname')) return faker.person.lastName();
  // "name" alone is too broad a match - it also catches labels like
  // "street name" or "hospital name" that aren't about a person at all
  // (confirmed from a real run: those got a fake person's name as their
  // value). only treat it as a person's name when the label actually
  // says so
  if (/\b(client|contact|patient|resident|full|alternative)\s*name\b/.test(l) || l.trim() === 'name') {
    return faker.person.fullName();
  }
  if (l.includes('goal')) return faker.helpers.arrayElement(CARE_GOALS);
  if (l.includes('note') || l.includes('risk') || l.includes('reason') || l.includes('comment')) {
    return isTextarea ? faker.helpers.arrayElement(CARE_NOTES) : faker.helpers.arrayElement(SHORT_NOTES);
  }
  return isTextarea ? faker.helpers.arrayElement(CARE_NOTES) : faker.helpers.arrayElement(SHORT_NOTES);
}

export class FormExplorer {
  private readonly navigation: WizardNavigation;

  constructor(private readonly page: Page) {
    this.navigation = new WizardNavigation(page);
  }

  // runs the whole wizard: repeatedly explores the current step, advances,
  // and stops once the Summary heading appears or a step can't be
  // completed. returns a full report rather than throwing, so a failed
  // step doesn't lose the evidence gathered on every step before it
  async run(formName: string, maxSteps = 30): Promise<ExplorationReport> {
    const report: ExplorationReport = {
      form: formName,
      startedAt: new Date().toISOString(),
      finishedAt: '',
      steps: [],
      reachedSummary: false,
      summary: { totalFields: 0, byKind: { dropdown: 0, radio: 0, checkbox: 0, richtext: 0, text: 0, unknown: 0 }, totalSteps: 0 },
    };

    for (let stepIndex = 0; stepIndex < maxSteps; stepIndex += 1) {
      const summaryVisible = await this.page
        .getByRole('heading', { name: 'Summary' })
        .isVisible()
        .catch(() => false);
      if (summaryVisible) {
        report.reachedSummary = true;
        break;
      }

      // test.step() groups everything inside it into one named,
      // collapsible entry in Playwright's own trace - without it, a
      // single step's worth of field scans and fills reads as one flat
      // list of dozens of raw locator actions with nothing showing
      // which ones belong together
      const stepReport = await test.step(`Step ${stepIndex}`, () => this.exploreStep(stepIndex));
      report.steps.push(stepReport);
      this.tallyInto(report.summary, stepReport.fields);

      if (stepReport.outcome === 'failed') {
        break;
      }
    }

    report.summary.totalSteps = report.steps.length;
    report.finishedAt = new Date().toISOString();
    return report;
  }

  // fills every field currently visible on this step (recursing into
  // anything a fill reveals), then tries to advance. if the app blocks
  // Next naming fields we haven't filled, attempts one recovery pass
  // scoped to exactly those names before giving up on this step
  private async exploreStep(stepIndex: number): Promise<StepReport> {
    const fields = await this.fillVisibleFields(new Set());

    try {
      await this.navigation.next();
      return { stepIndex, url: this.page.url(), fields, outcome: 'advanced', recoveredFields: [] };
    } catch (error) {
      const missing = this.parseMissingFields(error);
      const recovered: string[] = [];

      for (const label of missing) {
        const filled = await this.fillByLabel(label);
        if (filled) {
          fields.push(filled);
          recovered.push(label);
        }
      }

      if (recovered.length === 0) {
        return {
          stepIndex,
          url: this.page.url(),
          fields,
          outcome: 'failed',
          recoveredFields: [],
          error: error instanceof Error ? error.message : String(error),
        };
      }

      try {
        await this.navigation.next();
        return { stepIndex, url: this.page.url(), fields, outcome: 'recovered', recoveredFields: recovered };
      } catch (secondError) {
        return {
          stepIndex,
          url: this.page.url(),
          fields,
          outcome: 'failed',
          recoveredFields: recovered,
          error: secondError instanceof Error ? secondError.message : String(secondError),
        };
      }
    }
  }

  private parseMissingFields(error: unknown): string[] {
    const message = error instanceof Error ? error.message : String(error);
    const prefix = 'Required field(s) not filled: ';
    if (!message.startsWith(prefix)) {
      return [];
    }
    return message
      .slice(prefix.length)
      .split(',')
      .map((label) => label.trim())
      .filter((label) => label.length > 0);
  }

  // fills a single field found by its exact label text - used for the
  // recovery pass, where we know the name but haven't scanned for it yet
  private async fillByLabel(label: string): Promise<FilledField | null> {
    const group = this.page
      .locator('.form-group:visible')
      .filter({ has: this.page.locator('label', { hasText: label }) })
      .first();
    const present = await group.isVisible().catch(() => false);
    if (!present) {
      return null;
    }
    return test.step(label, () => this.fillGroup(group, label));
  }

  // repeatedly scans the step for not-yet-handled visible groups and
  // fills each one, recursing into anything newly revealed, until a full
  // pass finds nothing new - this is the "analyze the page as data goes
  // in" behavior: every fill is followed by a fresh look at the DOM
  private async fillVisibleFields(handled: Set<string>): Promise<FilledField[]> {
    const results: FilledField[] = [];

    for (let pass = 0; pass < 20; pass += 1) {
      const groups = this.page.locator('.form-group:visible');
      const count = await groups.count();
      let foundNew = false;

      for (let i = 0; i < count; i += 1) {
        const group = groups.nth(i);
        const label = await this.readGroupLabel(group);
        if (!label || handled.has(label)) {
          continue;
        }
        handled.add(label);
        foundNew = true;

        const filled = await test.step(label, () => this.fillGroup(group, label));
        if (filled) {
          results.push(filled);
        }
      }

      if (!foundNew) {
        break;
      }
    }

    return results;
  }

  private async readGroupLabel(group: Locator): Promise<string | null> {
    const label = group.locator('label').first();
    const present = await label.count();
    if (present === 0) {
      return null;
    }
    const text = (await label.textContent())?.trim();
    return text && text.length > 0 ? text : null;
  }

  private async fillGroup(group: Locator, label: string): Promise<FilledField | null> {
    const optional = /\(optional\)\s*$/i.test(label);
    const before = await this.countVisibleGroups();

    const kind = await this.classify(group);
    let value = '';

    try {
      switch (kind) {
        case 'dropdown': {
          const dropdown = SearchableDropdown.fromToggle(this.page, group.locator('button[role="combobox"]'));
          const picked = await dropdown.selectRandom();
          if (picked) {
            value = picked;
          }
          break;
        }
        case 'radio': {
          const radios = group.locator('input[type="radio"]');
          const radioCount = await radios.count();
          if (radioCount > 0) {
            const index = faker.number.int({ min: 0, max: radioCount - 1 });
            const chosen = radios.nth(index);
            value = (await chosen.getAttribute('data-text')) ?? `option ${index}`;
            await checkWithFallback(chosen);
          }
          break;
        }
        case 'checkbox': {
          const checkbox = group.locator('input[type="checkbox"]').first();
          if (await checkbox.count()) {
            value = (await checkbox.getAttribute('data-text')) ?? 'checked';
            await checkWithFallback(checkbox);
          }
          break;
        }
        case 'richtext': {
          const iframe = group.locator('iframe[id$="_ifr"]').first();
          const iframeId = await iframe.getAttribute('id');
          if (iframeId) {
            value = faker.helpers.arrayElement(CARE_NOTES);
            await new RichTextEditor(this.page, `#${iframeId}`).fill(value);
          }
          break;
        }
        case 'text': {
          const textarea = group.locator('textarea').first();
          const isTextarea = (await textarea.count()) > 0;
          const field = isTextarea ? textarea : group.locator('input').first();
          if (await field.count()) {
            value = guessTextValue(label, isTextarea);
            await field.fill(value);
          }
          break;
        }
        default:
          break;
      }
    } catch (error) {
      // leave the field unfilled rather than aborting the whole step -
      // next() will report it as missing if it was actually required,
      // which is a clearer signal than a crashed exploration run
      value = `<failed: ${error instanceof Error ? error.message : String(error)}>`;
    }

    const revealed = await this.detectReveal(before);

    return { label, kind, value, optional, revealed };
  }

  private async countVisibleGroups(): Promise<number> {
    return this.page.locator('.form-group:visible').count();
  }

  // a crude but effective reveal signal: more visible groups exist after
  // the fill than before. the next fillVisibleFields pass picks up what
  // they actually are by label, this just records that this field was a
  // trigger worth calling out in the report
  private async detectReveal(before: number): Promise<FilledField[]> {
    // a plain timer, not page.waitForTimeout() - that's a tracked
    // Playwright action flagged in the trace/report even at 0ms, and
    // doesn't actually wait long enough for a reveal animation anyway
    await new Promise((resolve) => setTimeout(resolve, 150));
    const after = await this.countVisibleGroups();
    if (after <= before) {
      return [];
    }
    return [
      {
        label: `(${after - before} new field(s) appeared)`,
        kind: 'unknown',
        value: '',
        optional: true,
        revealed: [],
      },
    ];
  }

  private async classify(group: Locator): Promise<FieldKind> {
    if (await group.locator('button[role="combobox"]').count()) return 'dropdown';
    if (await group.locator('input[type="radio"]').count()) return 'radio';
    if (await group.locator('input[type="checkbox"]').count()) return 'checkbox';
    if (await group.locator('iframe[id$="_ifr"]').count()) return 'richtext';
    if (await group.locator('textarea, input').count()) return 'text';
    return 'unknown';
  }

  private tallyInto(summary: ExplorationReport['summary'], fields: FilledField[]): void {
    for (const field of fields) {
      summary.totalFields += 1;
      summary.byKind[field.kind] += 1;
      if (field.revealed.length > 0) {
        this.tallyInto(summary, field.revealed);
      }
    }
  }
}
