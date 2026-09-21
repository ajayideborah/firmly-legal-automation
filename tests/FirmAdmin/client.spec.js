const path = require('path');
const { test, expect } = require('@playwright/test');
const { accounts } = require('../../fixtures/accounts');
const { LoginPage } = require('../../pages/LoginPage');
const { ClientPage } = require('../../pages/ClientPage');

const firmAdmin = accounts.firmAdmin[0];
// Corporate identification uploads accept .pdf, .png, .jpg and .jpeg only.
const identificationPath = process.env.TEST_IDENTIFICATION_PATH
  || path.resolve(__dirname, '../../fixtures/test-identification.png');

test.setTimeout(240000);

function uniqueId() {
  return `${Date.now()}${Math.floor(100 + Math.random() * 900)}`;
}

function individualData() {
  const id = uniqueId();
  return {
    firstName: 'Test',
    lastName: `Individual${id.slice(-3)}`,
    email: `firmlyindividual${id}@yopmail.com`,
    phone: `080${id.slice(-8)}`,
    address: '15 Test Avenue, Ikeja, Lagos',
    state: 'Lagos',
    lga: 'Ikeja',
    natureOfBusiness: 'Legal services',
    legalMatter: 'Debt Recovery',
  };
}

function corporateData() {
  const id = uniqueId();
  return {
    companyName: `Automation Legal Services ${id.slice(-6)} Ltd`,
    cacNumber: `RC${id.slice(-6)}`,
    directors: 'Test Director, Test Partner',
    contactPerson: 'Test Representative',
    email: `firmlycorporate${id}@yopmail.com`,
    phone: `081${id.slice(-8)}`,
    address: '25 Corporate Drive, Victoria Island, Lagos',
    state: 'Lagos',
    lga: 'Eti Osa',
    natureOfBusiness: 'Technology consulting',
    legalMatter: 'Contract Review',
  };
}

let clients;
const individualClient = individualData();
const corporateClient = corporateData();

test.describe.configure({ mode: 'serial' });

test.beforeEach(async ({ page }) => {
  const login = new LoginPage(page);
  clients = new ClientPage(page);

  await login.open();
  await login.login(firmAdmin);
  await clients.open();
});

test('Validate Firm Admin can create an individual client', { tag: '@smoke' }, async () => {
  const countBefore = await clients.getTotalClients();

  await clients.createIndividual(individualClient);
  await expect.poll(() => clients.getTotalClients(), { timeout: 20000 })
    .toBe(countBefore + 1);
  await clients.expectClientVisible(individualClient);
});

test('Validate Firm Admin detects a conflict for a duplicate individual client', async () => {
  const countBefore = await clients.getTotalClients();

  await clients.createIndividual(individualClient, false);
  await expect(clients.conflictMessage).toBeVisible();
  await clients.dismissConflict();
  await clients.open();
  await expect.poll(() => clients.getTotalClients(), { timeout: 20000 })
    .toBe(countBefore);
});

test('Validate Firm Admin can create a corporate client', async () => {
  const countBefore = await clients.getTotalClients();

  await clients.createCorporate(corporateClient, identificationPath);
  await expect.poll(() => clients.getTotalClients(), { timeout: 20000 })
    .toBe(countBefore + 1);
  await clients.expectClientVisible(corporateClient);
});

test('Validate Firm Admin detects a conflict for a duplicate corporate client', async () => {
  const countBefore = await clients.getTotalClients();

  await clients.createCorporate(corporateClient, identificationPath, false);
  await expect(clients.conflictMessage).toBeVisible();
  await clients.dismissConflict();
  await clients.open();
  await expect.poll(() => clients.getTotalClients(), { timeout: 20000 })
    .toBe(countBefore);
});

test('Validate Firm Admin can resolve a conflict as No Conflict and proceed with client creation', async () => {
  const client = individualData();
  await clients.createIndividual(client);
  const countBeforeResolution = await clients.getTotalClients();

  await clients.createIndividual(client, false);
  await clients.resolveConflict(
    'No Conflict (False Positive)',
    'Reviewed the matching record and confirmed there is no conflict.',
  );
  await clients.continueAfterNoConflict();
  await expect.poll(() => clients.getTotalClients(), { timeout: 20000 })
    .toBe(countBeforeResolution + 1);
});

test('Validate Firm Admin can resolve a conflict by proceeding with a waiver', async () => {
  const client = individualData();
  await clients.createIndividual(client);
  const countBeforeResolution = await clients.getTotalClients();

  await clients.createIndividual(client, false);
  await clients.resolveConflict(
    'Proceed with Waiver',
    'Client may proceed after reviewing and signing the conflict waiver.',
  );
  await clients.completeWaiverResolution(client);
  await expect.poll(() => clients.getTotalClients(), { timeout: 20000 })
    .toBe(countBeforeResolution + 1);
});

// TODO: submitting "Reassign Client" opens a "Reassign Case" dialog that asks
// for the new lawyer, then runs a fresh conflict check on that lawyer. What the
// page shows once that finishes is still unverified, so the success assertion
// below is a guess. Unskip after confirming the post-reassignment state.
test.skip('Validate Firm Admin can resolve a conflict by reassigning the client', async () => {
  const client = individualData();
  await clients.createIndividual(client);
  await clients.createIndividual(client, false);
  await clients.resolveConflict(
    'Reassign Client',
    'Reassigning the client to an appropriate lawyer to resolve the conflict.',
  );
  await clients.expectResolutionSubmitted();
});

// TODO: the reject path has never run to completion, so neither the success
// state nor the effect on the client count is confirmed. The assertion that the
// total stays unchanged is inherited from the old flow and unverified.
test.skip('Validate Firm Admin can resolve a conflict by rejecting the client', async () => {
  const client = individualData();
  await clients.createIndividual(client);
  const countBeforeResolution = await clients.getTotalClients();

  await clients.createIndividual(client, false);
  await clients.resolveConflict(
    'Reject Client',
    'Rejecting this client because the identified conflict cannot be resolved.',
  );
  await clients.expectResolutionSubmitted();
  await clients.open();
  await expect.poll(() => clients.getTotalClients(), { timeout: 20000 })
    .toBe(countBeforeResolution);
});
