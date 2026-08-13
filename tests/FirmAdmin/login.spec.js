const { test, expect } = require('@playwright/test');
const { accounts } = require('../../fixtures/accounts');
const { LoginPage } = require('../../pages/LoginPage');

const firmAdmin = accounts.firmAdmin[0];
let loginPage;

if (!firmAdmin) {
  throw new Error('No Firm Admin credentials are configured.');
}

test.describe('Firm Admin login', () => {
  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.open();
  });

  test('Validate Firm Admin can successfully log in', async ({ page }) => {
    await loginPage.login(firmAdmin);

    await expect(page).not.toHaveURL(/login/i);
  });

  test("Validate Firm Admin can't log in with an incorrect password", async () => {
    await loginPage.loginWith(firmAdmin.email, 'IncorrectPassword!123');

    await expect(loginPage.authenticationError).toBeVisible();
  });

  test("Validate Firm Admin can't log in with an incorrect email", async () => {
    await loginPage.loginWith(
      `incorrect-${Date.now()}@example.com`,
      firmAdmin.password,
    );

    await expect(loginPage.authenticationError).toBeVisible();
  });

  test("Validate Firm Admin can't log in with an invalid email format", async ({ page }) => {
    await loginPage.loginWith('invalid-email-format', firmAdmin.password);

    expect(await loginPage.emailInput.evaluate((input) => input.checkValidity())).toBe(false);
    await expect(page).toHaveURL(/login/i);
  });

  test("Validate Firm Admin can't log in with an empty email", async () => {
    await loginPage.loginWith('', firmAdmin.password);

    await expect(loginPage.emailRequiredError).toBeVisible();
  });

  test("Validate Firm Admin can't log in with an empty password", async () => {
    await loginPage.loginWith(firmAdmin.email, '');

    await expect(loginPage.passwordRequiredError).toBeVisible();
  });

  test("Validate Firm Admin can't log in with both fields empty", async () => {
    await loginPage.loginWith('', '');

    await expect(loginPage.emailRequiredError).toBeVisible();
    await expect(loginPage.passwordRequiredError).toBeVisible();
  });
});
