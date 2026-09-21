const { expect } = require('@playwright/test');

class DashboardPage {
  constructor(page) {
    this.page = page;
    this.heading = page.getByRole('heading', {
      name: 'Firm Overview',
      exact: true,
    });
    this.dashboardLink = page.getByRole('link', {
      name: 'Dashboard',
      exact: true,
    });
    this.statistics = page.getByRole('region', {
      name: 'Practice statistics',
    });
    this.upcomingEventsLink = page.getByRole('link', {
      name: 'SEE ALL UPCOMING EVENTS',
      exact: true,
    });
    this.calendarLink = page
      .getByRole('region', { name: 'Deadlines in the next 7 days' })
      .getByRole('link', { name: 'Calendar', exact: true });
    this.conflictQueue = page.getByRole('region', {
      name: 'Conflict queue',
    });
    this.allCases = page.getByRole('region', { name: 'All cases' });
  }

  async waitForLoaded() {
    await this.page.waitForURL((url) => url.pathname === '/', {
      timeout: 15_000,
    });
    await this.page.waitForLoadState('domcontentloaded');
    await expect(this.heading).toBeVisible({ timeout: 15_000 });
  }

  async open() {
    await this.page.goto('/');
    await this.waitForLoaded();
  }

  async openUpcomingEvents() {
    await this.upcomingEventsLink.click();
    await this.page.waitForURL(/\/calendar/);
  }

  async openDashboardCalendar() {
    await this.calendarLink.click();
    await this.page.waitForURL(/\/calendar/);
  }

  async attemptFirstConflictResolution() {
    await this.conflictQueue
      .getByRole('button', { name: 'Resolve', exact: true })
      .first()
      .click();
  }
}

module.exports = { DashboardPage };
