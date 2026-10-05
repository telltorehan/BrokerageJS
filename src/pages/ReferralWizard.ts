import { Locator, Page } from '@playwright/test';
import { RadioGroup } from '../components/RadioGroup';
import { RichTextEditor } from '../components/RichTextEditor';
import { SearchableDropdown } from '../components/SearchableDropdown';
import { AlternativeContact, ClientDetails, ReferralData } from '../data/referralData';

export class ReferralWizard {
  private readonly radios: RadioGroup;
  private readonly otherInformation: RichTextEditor;

  constructor(private readonly page: Page) {
    this.radios = new RadioGroup(page);
    this.otherInformation = new RichTextEditor(page, '#Ref_Client_OtherInformation_ifr');
  }

  get summaryHeading(): Locator {
    return this.page.getByRole('heading', { name: 'Summary' });
  }

  get submitButton(): Locator {
    return this.page.getByText('Submit referral', { exact: true });
  }

  get returnToDashboardLink(): Locator {
    return this.page.getByText('Return to dashboard', { exact: true });
  }

  async waitForLoaded(): Promise<void> {
    await this.page.waitForURL(/\/forms\/2/);
  }

  private async next(): Promise<void> {
    await this.page.getByText('Next', { exact: true }).click();
  }

  async completeIntro(): Promise<void> {
    await this.next();
  }

  async completeServiceLevel(serviceLevel: string): Promise<void> {
    await SearchableDropdown.byLabel(this.page, 'Service level').select(serviceLevel);
    await this.next();
  }

  async completePackageRequirements(data: ReferralData): Promise<void> {
    await SearchableDropdown.byLabel(this.page, 'Placement priority').select(data.placementPriority);
    await SearchableDropdown.byLabel(this.page, 'Placement funding').select(data.placementFunding);

    if (data.topUp) {
      const topUp = SearchableDropdown.byLabel(this.page, 'Top-up');
      if (await topUp.isPresent()) {
        await topUp.select(data.topUp);
      }
    }

    await this.page.locator('#Ref_PreferredLocation').fill(data.preferredLocation);
    await this.next();
  }

  async completeClientDetails(client: ClientDetails): Promise<void> {
    await SearchableDropdown.byLabel(this.page, 'Title').select(client.title);
    await this.page.locator('#Ref_Client_FirstName').fill(client.firstName);
    await this.page.locator('#Ref_Client_LastName').fill(client.lastName);

    await this.page.locator('#Ref_Client_DOB').fill(client.dobDisplay);
    await this.page.keyboard.press('Escape');

    await this.radios.choose(client.gender);
    // this label runs long, match on a stable leading fragment instead
    // of the full (and slightly variable) wording
    await this.radios.choose(client.serviceUserGroup, false);
    await this.next();
  }

  async completeNhsAndLas(data: ReferralData): Promise<void> {
    await this.page.locator('#Ref_Client_NHSNumber').fill(data.nhsNumber);
    await SearchableDropdown.byLabel(this.page, 'Does the client have an LAS number?').select(data.hasLasNumber);
    if (data.hasLasNumber === 'Yes') {
      // unlike Care Home, these are Yes/No radio groups rather than plain
      // checkboxes, and both groups share "Yes"/"No" option text on the
      // same visible page - scope each to its own question to avoid a
      // strict-mode collision
      await this.page.locator('#Ref_Client_LASNumber').fill(data.lasNumber);
      await this.radios.chooseWithinGroup('Is this a restricted record in LAS?', 'Yes');
      await this.radios.chooseWithinGroup('Are there any risks noted for the client in LAS?', 'Yes');
    }
    await this.next();
  }

  async completeCareHomeDetails(data: ReferralData): Promise<void> {
    await this.page.locator('#Ref_Client_CurrentWeeklyCost').fill(data.currentWeeklyCost);
    await this.page.locator('#Ref_Client_MoveReasonComments').fill(data.moveReasonComments);
    await this.next();
  }

  async completeMainCareNeeds(data: ReferralData): Promise<void> {
    for (const need of data.careNeeds) {
      const dropdown = SearchableDropdown.byDataId(this.page, `Ref_Client_Need_${need.key}`);
      await dropdown.select(need.level);
      await this.page.locator(`#Ref_Client_Need_${need.key}_Comment`).fill(need.comment);
    }
    await this.next();
  }

  async completeOtherInfo(text: string): Promise<void> {
    await this.otherInformation.fill(text);
    await this.next();
  }

  async completeInternalNotes(notes: string): Promise<void> {
    await this.page.locator('#Ref_BrokerageTeam').fill(notes.slice(0, 2000));
    await this.next();
  }

  async completeAlternativeContact(contact: AlternativeContact): Promise<void> {
    await this.page.locator('#Ref_Alternative_Name').fill(contact.name);
    await this.page.getByPlaceholder('Enter an email address').fill(contact.email);
    await this.page.getByPlaceholder('Enter a tel number in any').fill(contact.phone);
    await this.page.locator('#Ref_Alternative_Additional').fill(contact.additionalInfo);
    await this.page.getByText('Continue to summary', { exact: true }).click();
  }

  async submit(): Promise<void> {
    await this.submitButton.click();
    // the save happens after the click; if the test ends here the browser
    // tears down mid-request and the referral never actually lands
    await this.returnToDashboardLink.waitFor({ state: 'visible', timeout: 30_000 });
  }

  async returnToDashboard(): Promise<void> {
    await this.returnToDashboardLink.click();
    await this.page.waitForURL(/\/referralhome/i);
  }
}
