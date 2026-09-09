# BrokerageJS

Playwright tests for the residential referral flow in the CareCubed Brokerage app. They cover logging in, starting a new referral, picking the Residential type, filling in the full wizard, and either stopping at the summary screen or actually submitting.

## Layout

src/pages        one class per screen: login, dashboard, the "new referral" modal, the wizard itself
src/components   shared drivers for the dropdown widget, radio groups, and the rich text field
src/data         types for the referral data plus a generator that fills in realistic values
tests            the two specs

Tests dont touch selectors directly. Anything that has to know about the actual page structure lives in src/pages or src/components, so if the app changes a label or an id, theres one place to fix it.

## Requirements

Node 18 or newer, and a login for the app itself.

## Setup

npm install
npx playwright install chromium
copy .env.example .env

Open .env and fill in BROKERAGE_EMAIL and BROKERAGE_PASSWORD with a real account. BASE_URL already points at the live app, change it only if youre testing against a different environment.

.env is not committed. Dont add real credentials anywhere else in the project.

## Running the tests

npm run test:safe      fills the whole wizard and stops at the summary screen, nothing gets saved
npm run test:submit    same thing but actually clicks submit and creates a real referral
npm run test:headed    runs with a visible browser window instead of headless
npm run report         opens the html report from the last run

Use test:safe for everyday runs. test:submit creates a real record every time it runs and has retries turned off on purpose, so only run it when you actually mean to add one.

## If a field starts failing

Most fields on this form use a custom searchable dropdown rather than a plain select, and their option lists are specific to each field. If the app adds, renames, or reorders an option, the affected dropdown will start timing out or throwing a strict mode error naming two matching elements. Both point at the same fix: open the html report for the failed run, check the option text against whats in src/data/referralData.ts, and update it there.

The radio buttons, the rich text box, and the alternative contact fields are plain enough that they rarely need touching once theyre working.
