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

test('Validate Firm Admin can access the dashboard', { tag: '@smoke' }, async ({ page }) => {
  await expect(page).toHaveURL((url) => url.pathname === '/');
  await expect(dashboard.heading).toBeVisible();
});

test('Validate Firm Admin can see dashboard navigation', async () => {
  await expect(dashboard.dashboardLink).toBeVisible();
  await expect(dashboard.dashboardLink).toHaveAttribute('href', '/');
});

test('Validate Firm Admin remains logged in after refreshing the dashboard', async ({
  page,
}) => {
  await page.reload();
  await dashboard.waitForLoaded();

  await expect(page).toHaveURL((url) => url.pathname === '/');
  await expect(dashboard.heading).toBeVisible();
});

test('Validate Firm Admin can open the dashboard directly after login', async ({
  page,
}) => {
  await dashboard.open();

  await expect(page).toHaveURL((url) => url.pathname === '/');
  await expect(dashboard.heading).toBeVisible();
});

test('Validate Firm Admin can see dashboard practice statistics', { tag: '@smoke' }, async () => {
  await expect(dashboard.statistics).toBeVisible();
  await expect(dashboard.statistics.getByText('Total Cases', { exact: true })).toBeVisible();
  await expect(dashboard.statistics.getByText('Active Cases', { exact: true })).toBeVisible();
  await expect(dashboard.statistics.getByText('Active Lawyers', { exact: true })).toBeVisible();
  await expect(
    dashboard.statistics.getByText('Outstanding Invoices', { exact: true }),
  ).toBeVisible();
});

test('Validate Firm Admin can open all upcoming events from the dashboard', async ({
  page,
}) => {
  await dashboard.openUpcomingEvents();

  await expect(page).toHaveURL(/\/calendar/);
});

test('Validate Firm Admin can open Calendar from the deadlines card', async ({
  page,
}) => {
  await dashboard.openDashboardCalendar();

  await expect(page).toHaveURL(/\/calendar/);
});

test('Validate Firm Admin can see and attempt to resolve a conflict', async ({
  page,
}) => {
  await expect(dashboard.conflictQueue).toBeVisible();
  await expect(
    dashboard.conflictQueue.getByRole('button', {
      name: 'Resolve',
      exact: true,
    }).first(),
  ).toBeVisible();

  await dashboard.attemptFirstConflictResolution();

  await expect(
    page.getByRole('dialog').or(page.getByText(/resolve.*conflict|conflict.*resolution/i)).first(),
  ).toBeVisible();
});

test('Validate Firm Admin can see the All Cases table', async () => {
  await expect(dashboard.allCases).toBeVisible();
  await expect(
    dashboard.allCases.getByRole('heading', { name: 'All Cases', exact: true }),
  ).toBeVisible();
  await expect(dashboard.allCases.getByRole('table')).toBeVisible();
  await expect(
    dashboard.allCases.getByRole('columnheader', { name: 'Case Title' }),
  ).toBeVisible();
  await expect(
    dashboard.allCases.getByRole('columnheader', { name: 'Client Name' }),
  ).toBeVisible();
});
