const { test: base, expect } = require('@playwright/test');
const { accounts } = require('./accounts');

async function login(page, account) {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(account.email);
  await page.getByLabel(/password/i).fill(account.password);
  await page.getByRole('button', { name: /sign in|log in/i }).click();
  await page.waitForURL((url) => !url.pathname.includes('/login'));
}

const test = base.extend({
  accounts: async ({}, use) => {
    await use(accounts);
  },

  loginAs: async ({ page }, use) => {
    await use(async (account) => {
      if (!account?.email || !account?.password) {
        throw new Error(
          'loginAs requires an account object containing email and password.',
        );
      }

      await login(page, account);
      return page;
    });
  },
});

module.exports = { test, expect, accounts };
