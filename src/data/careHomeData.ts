import { faker } from '@faker-js/faker';
import { AlternativeContact, CARE_NEED_KEYS, CareNeedKey } from './referralData';

export interface CareHomeClientDetails {
  title: string;
  firstName: string;
  lastName: string;
  dobDisplay: string;
  gender: 'Male' | 'Female';
  serviceUserGroup: string;
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
  // fixed option lists, confirmed against the real app
  serviceLevel: string;
  referralReason: string;
  gender: 'Male' | 'Female';
  daysNeeded: string[];
  equipment: string[];
  // free text - any reasonable value works, no fixed option list to match
  startDateDisplay: string;
  durationRequired: string;
  hospitalTeam: string;
  nhsNumber: string;
  hasLasNumber: 'Yes' | 'No';
  lasNumber: string;
  isHospitalDischarge: 'Yes' | 'No';
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
    serviceLevel: 'One Care Worker Only',
    referralReason: 'New Referral',
    hospitalTeam: 'Croydon Hospital',
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
    isHospitalDischarge: 'Yes',
    wardName: faker.lorem.words(2),
    // a plain random digit string fails this field's UK phone format check
    // (leading zero required), which was marking the whole Hospital
    // Discharge step incomplete and blocking later sections from appearing
    wardTelephone: `07${faker.string.numeric(9)}`,
    client: {
      title: gender === 'Male' ? 'Mr' : 'Mrs',
      firstName,
      lastName,
      dobDisplay: toUkDate(dob),
      gender,
      serviceUserGroup: 'Older People',
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
