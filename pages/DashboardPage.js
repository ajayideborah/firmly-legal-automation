const { expect } = require('@playwright/test');

class DashboardPage {
  constructor(page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: /dashboard/i }).first();
    this.navigation = page.getByRole('navigation').first();
  }

  async waitForLoaded() {
    await expect(this.page).not.toHaveURL(/login/i);
    await this.page.waitForLoadState('domcontentloaded');
  }

  async open() {
    await this.page.goto('/dashboard');
    await this.waitForLoaded();
  }
}

module.exports = { DashboardPage };
