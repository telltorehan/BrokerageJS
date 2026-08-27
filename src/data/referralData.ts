import { faker } from '@faker-js/faker';

export const CARE_NEED_KEYS = [
  'Behavioural',
  'Cognitive',
  'Dietary',
  'Hygiene',
  'Mobility',
  'SkinIntegrity',
  'Communication',
  'Clothing',
  'Sensory',
] as const;

export type CareNeedKey = (typeof CARE_NEED_KEYS)[number];

export interface CareNeed {
  key: CareNeedKey;
  level: string;
  comment: string;
}

export interface ClientDetails {
  title: string;
  firstName: string;
  lastName: string;
  dobDisplay: string;
  gender: 'Male' | 'Female';
  serviceUserGroup: string;
}

export interface AlternativeContact {
  name: string;
  email: string;
  phone: string;
  additionalInfo: string;
}

export interface ReferralData {
  serviceLevel: string;
  placementPriority: string;
  placementFunding: string;
  // real option text isn't confirmed yet, leave unset until it is -
  // guessing wrong here just trades a skipped field for a hung test
  topUp?: string;
  preferredLocation: string;
  client: ClientDetails;
  nhsNumber: string;
  hasLasNumber: string;
  currentWeeklyCost: string;
  moveReasonComments: string;
  careNeeds: CareNeed[];
  otherInformation: string;
  internalNotes: string;
  alternativeContact: AlternativeContact;
}

// each need has its own distinct option set, not a shared severity scale
const CARE_NEED_OPTIONS: Record<CareNeedKey, string[]> = {
  Behavioural: [
    'No evidence of challenging behaviour',
    'Disinhibition - inappropriate or unwanted behaviour',
    'Highly anxious',
    'Physical Aggression',
    'Resistance to care or treatment',
    'Verbal Aggression',
    'Wandering',
    'Other - please detail in comments box below',
    'Unknown',
  ],
  Cognitive: [
    'No evidence of impairment, confusion or disorientation',
    'Brain injury',
    'Delirium',
    'Dementia - Alcohol-related dementia (e.g. Korsakoffs)',
    'Dementia - Alzheimer’s',
    'Dementia - Frontotemporal',
    'Dementia - Huntington’s Disease',
    'Dementia - Lewy body dementia',
    'Dementia - Mixed dementia',
    'Dementia - Posterior cortical atrophy (PCA)',
    'Dementia - Vascular dementia',
    'Parkinsons',
    'Stroke',
    'Undiagnosed confusion/ memory loss',
    'Other - please detail in comments box below',
    'Unknown',
  ],
  Dietary: [
    'Normal diet',
    'Needs support as at risk of malnutrition / dehydration',
    'Soft, bite sized/ minced',
    'PEG or RIG feeding',
    'Pureed diet / Thickened fluids',
    'Other - please detail in comments box below',
    'Unknown',
  ],
  Hygiene: [
    'Support with bathing',
    'Prompt bathing',
    'No support needed',
    'Other - please detail in comments box below',
    'Unknown',
  ],
  Mobility: [
    'Independent - mobile',
    'Client is confined to bed',
    'Falls risk',
    'Hoisting need',
    'Wheelchair user',
    'Other - please detail in comments box below',
    'Unknown',
  ],
  SkinIntegrity: [
    'Skin intact',
    'Cat 2 Pressure Ulcer: open wound/ blister',
    'Cat 3 Pressure Ulcer: reaching deepest layer of skin',
    'Cat 4 Pressure ulcer: wound reaches muscle and bone',
    'Other - Please detail in comments box below',
    'Unknown',
  ],
  Communication: [
    'English',
    'Other spoken language - detail in summary box',
    'British Sign Language',
    'Makaton',
    'Other sign language',
    'Other - please detail in comments box below',
    'Unknown',
  ],
  Clothing: [
    'Support getting (un)dressed',
    'Prompt getting (un)dressed',
    'Support choosing appropriate clothes',
    'No support needed',
    'Other - please detail in comments box below',
    'Unknown',
  ],
  Sensory: [
    'No sensory impairment',
    'Hard of hearing',
    'Deaf',
    'Deaf and British Sign Language user',
    'Vision Impairment',
    'Dual sensory loss',
    'Other - please detail in comments box below',
    'Unknown',
  ],
};

function toUkDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${date.getFullYear()}`;
}

export function buildReferralData(): ReferralData {
  const gender: 'Male' | 'Female' = faker.person.sexType() === 'male' ? 'Male' : 'Female';
  const firstName = faker.person.firstName(gender === 'Male' ? 'male' : 'female');
  const lastName = faker.person.lastName();
  const dob = faker.date.birthdate({ min: 70, max: 95, mode: 'age' });

  return {
    serviceLevel: 'Enhanced Residential',
    placementPriority: 'Long term',
    placementFunding: 'S117',
    preferredLocation: faker.location.city(),
    client: {
      title: gender === 'Male' ? 'Mr' : 'Mrs',
      firstName,
      lastName,
      dobDisplay: toUkDate(dob),
      gender,
      serviceUserGroup: 'Learning Disabilities',
    },
    nhsNumber: faker.string.numeric(10),
    hasLasNumber: 'No',
    currentWeeklyCost: faker.number.int({ min: 500, max: 1500 }).toString(),
    moveReasonComments: faker.lorem.sentence(),
    careNeeds: CARE_NEED_KEYS.map((key) => ({
      key,
      level: faker.helpers.arrayElement(CARE_NEED_OPTIONS[key]),
      comment: faker.lorem.sentence(),
    })),
    otherInformation: faker.lorem.paragraph(),
    internalNotes: faker.lorem.paragraphs(2),
    alternativeContact: {
      name: faker.person.fullName(),
      email: faker.internet.email(),
      phone: faker.phone.number(),
      additionalInfo: faker.lorem.sentence(),
    },
  };
}
