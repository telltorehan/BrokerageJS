import { Locator, Page } from '@playwright/test';
import { CheckboxGroup } from '../components/CheckboxGroup';
import { RadioGroup } from '../components/RadioGroup';
import { RichTextEditor } from '../components/RichTextEditor';
import { SearchableDropdown } from '../components/SearchableDropdown';
import { AlternativeContact } from '../data/referralData';
import { CareHomeClientDetails, CareHomeData } from '../data/careHomeData';

export class CareHomeWizard {
  private readonly radios: RadioGroup;
  private readonly checkboxes: CheckboxGroup;
  private readonly additionalMedicalHistory: RichTextEditor;
  private readonly otherInformation: RichTextEditor;
  private readonly internalNotes: RichTextEditor;

  constructor(private readonly page: Page) {
    this.radios = new RadioGroup(page);
    this.checkboxes = new CheckboxGroup(page);
    this.additionalMedicalHistory = new RichTextEditor(page, '#Add_Med_Info_ifr');
    this.otherInformation = new RichTextEditor(page, '#Ref_Client_OtherInformation_ifr');
    // unlike Residential, this form's internal notes field is TinyMCE
    // rich text, not a plain textarea - same id, different widget
    this.internalNotes = new RichTextEditor(page, '#Ref_BrokerageTeam_ifr');
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
    // route number isn't confirmed for this form, only that it's a wizard
    await this.page.waitForURL(/\/forms\/\d+/);
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

  async completeReferralDetails(data: CareHomeData): Promise<void> {
    await SearchableDropdown.byLabel(this.page, 'Referral reason').select(data.referralReason);
    await this.page.getByRole('textbox', { name: '/00/0000' }).fill(data.startDateDisplay);
    await this.checkboxes.checkAll(data.daysNeeded);
    await this.page.locator('#Duration_Req').fill(data.durationRequired);
    await this.radios.choose(data.gender);
    await this.checkboxes.checkAll(data.equipment);
    await this.next();
  }

  async completeNhsAndLas(data: CareHomeData): Promise<void> {
    await this.page.locator('#Ref_Client_NHSNumber').fill(data.nhsNumber);
    await this.radios.choose(data.hasLasNumber);
    if (data.hasLasNumber === 'Yes') {
      await this.page.locator('#Ref_Client_LASNumber').fill(data.lasNumber);
      await this.page.locator('#LAS_Restricted_1').check();
      await this.page.locator('#LAS_Risks_1').check();
    }
    await this.next();
  }

  async completeHospitalDetails(data: CareHomeData): Promise<void> {
    await this.radios.choose(data.isInpatient);
    if (data.isInpatient === 'Yes') {
      await SearchableDropdown.byLabel(this.page, 'Hospital').select(data.hospitalTeam);
      await this.page.locator('#Ward_Name').fill(data.wardName);
      await this.page.locator('#Ward_TelNumber').fill(data.wardTelephone);
    }
    await this.next();
  }

  // client details, address, care needs, rich text fields and alternative
  // contact all live on one page - the recording never showed a "Next"
  // click anywhere in this block, only the final button below

  async completeClientDetails(client: CareHomeClientDetails): Promise<void> {
    await SearchableDropdown.byLabel(this.page, 'Title').select(client.title);
    await this.page.locator('#Ref_Client_FirstName').fill(client.firstName);
    await this.page.locator('#Ref_Client_LastName').fill(client.lastName);
    await this.page.locator('#Ref_Client_DOB').fill(client.dobDisplay);
    await this.page.keyboard.press('Escape');
    await this.page.locator('#Address_Line1').fill(client.addressLine1);
    await this.page.locator('#Address_Line2').fill(client.addressLine2);
    await this.page.locator('#Town_CHA').fill(client.town);
    await this.page.locator('#County').fill(client.county);
    await this.page.locator('#Ref_Client_Postcode').fill(client.postcode);
  }

  async completeMainCareNeeds(data: CareHomeData): Promise<void> {
    // dropdown toggles for these nine needs weren't exercised in the
    // recording, so only the comment fields are filled for now - same
    // option-set research this project already did for Residential will
    // need repeating here before the dropdowns themselves can be driven
    for (const need of data.careNeeds) {
      await this.page.locator(`#Ref_Client_Need_${need.key}_Comment`).fill(need.comment);
    }
  }

  async completeAdditionalInfo(data: CareHomeData): Promise<void> {
    await this.additionalMedicalHistory.fill(data.additionalMedicalHistory);
    await this.otherInformation.fill(data.otherInformation);
    await this.internalNotes.fill(data.internalNotes);
  }

  async completeAlternativeContact(contact: AlternativeContact): Promise<void> {
    await this.page.locator('#alernative_name').fill(contact.name);
    await this.page.locator('#alternative_contact_no').fill(contact.phone);
    await this.page.locator('#alternative_email_address').fill(contact.email);
    await this.page.locator('#Ref_Alternative_Additional').fill(contact.additionalInfo);
    // button text on this page isn't confirmed - following Residential's
    // convention for the equivalent last data-entry page
    await this.page.getByText('Continue to summary', { exact: true }).click();
  }

  async submit(): Promise<void> {
    await this.submitButton.click();
    await this.returnToDashboardLink.waitFor({ state: 'visible', timeout: 30_000 });
  }

  async returnToDashboard(): Promise<void> {
    await this.returnToDashboardLink.click();
    await this.page.waitForURL(/\/referralhome/i);
  }
}
