import { faker } from '@faker-js/faker';
import { AlternativeContact, CARE_NEED_KEYS, CareNeedKey } from './referralData';

export interface CareHomeClientDetails {
  title: string;
  firstName: string;
  lastName: string;
  dobDisplay: string;
  gender: 'Male' | 'Female';
  addressLine1: string;
  addressLine2: string;
  town: string;
  county: string;
  postcode: string;
}

export interface CareHomeCareNeed {
  key: CareNeedKey;
  comment: string;
}

export interface CareHomeData {
  // these four are confirmed option lists, not guesses
  serviceLevel: string;
  gender: 'Male' | 'Female';
  // the rest of this group are unconfirmed - real option text wasn't
  // available from the recording, see src/pages/CareHomeWizard.ts
  referralReason: string;
  hospitalTeam: string;
  startDateDisplay: string;
  daysNeeded: string[];
  durationRequired: string;
  equipment: string[];
  nhsNumber: string;
  hasLasNumber: 'Yes' | 'No';
  lasNumber: string;
  isInpatient: 'Yes' | 'No';
  wardName: string;
  wardTelephone: string;
  client: CareHomeClientDetails;
  careNeeds: CareHomeCareNeed[];
  additionalMedicalHistory: string;
  otherInformation: string;
  internalNotes: string;
  alternativeContact: AlternativeContact;
}

function toUkDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${date.getFullYear()}`;
}

export function buildCareHomeData(): CareHomeData {
  const gender: 'Male' | 'Female' = faker.person.sexType() === 'male' ? 'Male' : 'Female';
  const firstName = faker.person.firstName(gender === 'Male' ? 'male' : 'female');
  const lastName = faker.person.lastName();
  const dob = faker.date.birthdate({ min: 70, max: 95, mode: 'age' });
  const startDate = faker.date.soon({ days: 14 });

  return {
    serviceLevel: 'Standard',
    referralReason: 'Hospital discharge',
    hospitalTeam: 'Not applicable',
    startDateDisplay: toUkDate(startDate),
    daysNeeded: ['Monday', 'Wednesday', 'Friday'],
    durationRequired: '1 hour',
    gender,
    equipment: ['Mobility aids', 'Wheelchair user'],
    nhsNumber: faker.string.numeric(10),
    // "Yes" is the only branch the recording actually exercised for both
    // of these - "No" might hide the fields below differently, and
    // there's no evidence either way yet
    hasLasNumber: 'Yes',
    lasNumber: faker.string.numeric(12),
    isInpatient: 'Yes',
    wardName: faker.lorem.words(2),
    wardTelephone: faker.string.numeric(11),
    client: {
      title: gender === 'Male' ? 'Mr' : 'Mrs',
      firstName,
      lastName,
      dobDisplay: toUkDate(dob),
      gender,
      addressLine1: faker.location.buildingNumber(),
      addressLine2: faker.location.street(),
      town: faker.location.city(),
      county: faker.location.county(),
      postcode: faker.location.zipCode(),
    },
    careNeeds: CARE_NEED_KEYS.map((key) => ({
      key,
      comment: faker.lorem.sentence(),
    })),
    additionalMedicalHistory: faker.lorem.sentence(),
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
