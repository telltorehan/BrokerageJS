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
    // unlike Residential, this form's summary button just says "Submit"
    return this.page.getByText('Submit', { exact: true });
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
    await this.radios.chooseWithinGroup('Preferred Gender of Care Worker', data.gender);
    await this.checkboxes.checkAll(data.equipment);
    await this.next();
  }

  async completeNhsAndLas(data: CareHomeData): Promise<void> {
    await this.page.locator('#Ref_Client_NHSNumber').fill(data.nhsNumber);
    await this.radios.chooseWithinGroup('Does the client have an LAS number?', data.hasLasNumber);
    if (data.hasLasNumber === 'Yes') {
      await this.page.locator('#Ref_Client_LASNumber').fill(data.lasNumber);
      await this.page.locator('#LAS_Restricted_1').check();
      await this.page.locator('#LAS_Risks_1').check();
    }
    await this.next();
  }

  async completeHospitalDetails(data: CareHomeData): Promise<void> {
    await this.radios.chooseWithinGroup('Is this a hospital discharge?', data.isHospitalDischarge);
    if (data.isHospitalDischarge === 'Yes') {
      await SearchableDropdown.byLabel(this.page, 'Select the hospital team').select(data.hospitalTeam);
      await this.page.locator('#Ward_Name').fill(data.wardName);
      await this.page.locator('#Ward_TelNumber').fill(data.wardTelephone);
    }
    await this.next();
  }

  // unlike the assumption this comment used to make, Client's Personal
  // Details is its own step - the address fields only become visible on
  // the next step after clicking "Next" here, confirmed by three separate
  // runs where only this step's own fields ever appeared on screen

  async completeClientDetails(client: CareHomeClientDetails): Promise<void> {
    await SearchableDropdown.byLabel(this.page, 'Title').select(client.title);
    await this.page.locator('#Ref_Client_FirstName').fill(client.firstName);
    await this.page.locator('#Ref_Client_LastName').fill(client.lastName);
    await this.page.locator('#Ref_Client_DOB').fill(client.dobDisplay);
    await this.page.keyboard.press('Escape');
    await this.radios.chooseWithinGroup('Client Gender', client.gender);
    await SearchableDropdown.byLabel(this.page, 'Service User Group').select(client.serviceUserGroup);
    await this.next();
  }

  async completeAddress(client: CareHomeClientDetails): Promise<void> {
    await this.page.locator('#Address_Line1').fill(client.addressLine1);
    await this.page.locator('#Address_Line2').fill(client.addressLine2);
    await this.page.locator('#Town_CHA').fill(client.town);
    await this.page.locator('#County').fill(client.county);
    await this.page.locator('#Ref_Client_Postcode').fill(client.postcode);
    await this.next();
  }

  async completeMainCareNeeds(data: CareHomeData): Promise<void> {
    // same field data-ids and option sets as Residential - the comment
    // box for each need stays hidden until a dropdown option is chosen.
    // unlike Residential, not every need here has a comment box at all
    // (Clothing never shows one, regardless of the option picked), so
    // only fill it if it actually appears rather than assuming it exists
    for (const need of data.careNeeds) {
      const dropdown = SearchableDropdown.byDataId(this.page, `Ref_Client_Need_${need.key}`);
      await dropdown.select(need.level);
      const comment = this.page.locator(`#Ref_Client_Need_${need.key}_Comment`);
      const hasComment = await comment
        .waitFor({ state: 'visible', timeout: 2000 })
        .then(() => true)
        .catch(() => false);
      if (hasComment) {
        await comment.fill(need.comment);
      }
    }
    await this.next();
  }

  // Medical history, Other Information and Internal Notes are each their
  // own step, same pattern as every other section on this form - the
  // original assumption that they shared one page was never confirmed
  // and turned out wrong, same as the earlier client details/address split

  async completeMedicalHistory(data: CareHomeData): Promise<void> {
    await SearchableDropdown.byLabel(this.page, 'Medical diagnosis').select(data.medicalDiagnosis);
    await this.additionalMedicalHistory.fill(data.additionalMedicalHistory);
    await this.next();
  }

  async completeOtherInfo(text: string): Promise<void> {
    await this.otherInformation.fill(text);
    await this.next();
  }

  async completeInternalNotes(notes: string): Promise<void> {
    await this.internalNotes.fill(notes);
    await this.next();
  }

  async completeReferralTeam(data: CareHomeData): Promise<void> {
    await this.radios.chooseWithinGroup(
      'Which type of team is making the referral?',
      data.referralTeamType,
    );
    // choosing "Hospital team" reveals its own "Select the hospital team"
    // dropdown here, separate from the one on the earlier Hospital
    // Discharge step - skipping it blocks Next with a validation popup
    if (data.referralTeamType === 'Hospital team') {
      await SearchableDropdown.byLabel(this.page, 'Select the hospital team').select(data.hospitalTeam);
    }
    await this.next();
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
