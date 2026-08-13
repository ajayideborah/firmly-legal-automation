const { test, expect } = require('@playwright/test');
const { accounts } = require('../../fixtures/accounts');
const { LoginPage } = require('../../pages/LoginPage');
const { DashboardPage } = require('../../pages/DashboardPage');

const firmAdmin = accounts.firmAdmin[0];

if (!firmAdmin) {
  throw new Error('No Firm Admin credentials are configured.');
}

let dashboard;

test.beforeEach(async ({ page }) => {
  const loginPage = new LoginPage(page);
  dashboard = new DashboardPage(page);

  await loginPage.open();
  await loginPage.login(firmAdmin);
  await dashboard.waitForLoaded();
});

test('Validate Firm Admin can access the dashboard', async ({ page }) => {
  await expect(page).toHaveURL(/dashboard/i);
  await expect(dashboard.heading).toBeVisible();
});

test('Validate Firm Admin can see dashboard navigation', async () => {
  await expect(dashboard.navigation).toBeVisible();
  await expect(dashboard.navigation.getByRole('link').first()).toBeVisible();
});

test('Validate Firm Admin remains logged in after refreshing the dashboard', async ({
  page,
}) => {
  await page.reload();
  await dashboard.waitForLoaded();

  await expect(page).toHaveURL(/dashboard/i);
  await expect(dashboard.heading).toBeVisible();
});

test('Validate Firm Admin can open the dashboard directly after login', async ({
  page,
}) => {
  await dashboard.open();

  await expect(page).toHaveURL(/dashboard/i);
  await expect(dashboard.heading).toBeVisible();
});
