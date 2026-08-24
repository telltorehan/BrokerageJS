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

const CARE_NEED_LEVELS = ['No needs identified', 'Low level need', 'Moderate level need', 'High level need'];

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
      serviceUserGroup: 'Older people',
    },
    nhsNumber: faker.string.numeric(10),
    hasLasNumber: 'No',
    currentWeeklyCost: faker.number.int({ min: 500, max: 1500 }).toString(),
    moveReasonComments: faker.lorem.sentence(),
    careNeeds: CARE_NEED_KEYS.map((key) => ({
      key,
      level: faker.helpers.arrayElement(CARE_NEED_LEVELS),
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
