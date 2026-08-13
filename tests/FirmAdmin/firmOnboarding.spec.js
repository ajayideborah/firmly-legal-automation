const { test, expect } = require('@playwright/test');
const { FirmOnboardingPage } = require('../../pages/FirmOnboardingPage');

function createFirmData() {
  const id = Math.floor(100 + Math.random() * 900);

  return {
    legalName: `Firmly Legal Test Firm ${id}`,
    inbox: `firmlytest${id}`,
    email: `firmlytest${id}@yopmail.com`,
    phone: `08012345${id}`,
    address: '15 Test Avenue, Ikeja, Lagos',
    state: 'Lagos',
    password: '@Anything1',
  };
}

async function getYopmailCode(browser, inbox) {
  const yopmail = await browser.newPage();
  await yopmail.goto('https://yopmail.com/en/');

  await yopmail.locator('#login').fill(inbox);
  await yopmail.locator('#refreshbut').click();

  for (let attempt = 1; attempt <= 10; attempt += 1) {
    const inboxFrame = yopmail.frameLocator('#ifinbox');
    const firstEmail = inboxFrame.locator('.m').first();

    if (await firstEmail.isVisible().catch(() => false)) {
      await firstEmail.click();

      const message = await yopmail
        .frameLocator('#ifmail')
        .locator('body')
        .innerText();
      const code =
        message.match(/(?:otp|verification code|code)\D*(\d{4,8})/i)?.[1] ??
        message.match(/\b\d{4,8}\b/)?.[0];

      if (code) {
        await yopmail.close();
        return code;
      }
    }

    await yopmail.waitForTimeout(3000);
    await yopmail.locator('#refresh').click().catch(() => yopmail.reload());
  }

  await yopmail.close();
  throw new Error('No verification code arrived in Yopmail within 30 seconds.');
}

async function openFirmInformation(onboarding) {
  await onboarding.openFromLogin();
  await onboarding.selectLawFirm();
}

async function reachPasswordStep(onboarding, browser, firm) {
  await openFirmInformation(onboarding);
  await onboarding.fillFirmInformation(firm);
  const code = await getYopmailCode(browser, firm.inbox);
  await onboarding.enterVerificationCode(code);
}

test('Validate Firm Admin can complete firm onboarding', async ({ page, browser }) => {
  test.setTimeout(120_000);

  const onboarding = new FirmOnboardingPage(page);
  const firm = createFirmData();

  console.log(`Onboarding email: ${firm.email}`);
  console.log(`Onboarding password: ${firm.password}`);

  await openFirmInformation(onboarding);
  await onboarding.fillFirmInformation(firm);

  await expect(
    page.getByText(/verify.*email|email.*verification/i).first(),
  ).toBeVisible();

  const code = await getYopmailCode(browser, firm.inbox);
  await onboarding.enterVerificationCode(code);

  await onboarding.setPassword(firm.password);
  await onboarding.expectPlanSelection();
});

test('Validate Firm Admin cannot continue with an invalid email format', async ({
  page,
}) => {
  const onboarding = new FirmOnboardingPage(page);
  const firm = createFirmData();
  firm.email = 'invalid-email';

  await openFirmInformation(onboarding);
  await onboarding.fillFirmInformation(firm);

  await expect(page.getByText(/valid email|email.*invalid/i).first()).toBeVisible();
});

test('Validate Firm Admin cannot continue with a phone number below 10 digits', async ({
  page,
}) => {
  const onboarding = new FirmOnboardingPage(page);
  const firm = createFirmData();
  firm.phone = '080123456';

  await openFirmInformation(onboarding);
  await onboarding.fillFirmInformation(firm);

  await expect(
    page.getByText(/phone.*(?:10|11).*digit|valid phone/i).first(),
  ).toBeVisible();
});

test('Validate Firm Admin cannot verify with an incorrect OTP', async ({ page }) => {
  test.setTimeout(60_000);

  const onboarding = new FirmOnboardingPage(page);
  const firm = createFirmData();

  await openFirmInformation(onboarding);
  await onboarding.fillFirmInformation(firm);
  const wrongCode = String(Math.floor(10000 + Math.random() * 90000));
  await onboarding.enterVerificationCode(wrongCode);

  await expect(
    page.getByText(/invalid|incorrect|expired|verification.*failed/i).first(),
  ).toBeVisible();
});

test('Validate Firm Admin cannot continue with a weak password', async ({
  page,
  browser,
}) => {
  test.setTimeout(120_000);

  const onboarding = new FirmOnboardingPage(page);
  const firm = createFirmData();

  await reachPasswordStep(onboarding, browser, firm);
  await onboarding.fillPassword('weak');
  await onboarding.submitPassword();

  await expect(
    page.getByRole('listitem', { name: /at least 8 characters: (?:not met|unmet)/i }),
  ).toBeVisible();
  await expect(page.getByText('Step 3 of 4', { exact: true })).toBeVisible();
});
