class LoginPage {
  constructor(page) {
    this.page = page;
    this.emailInput = page.getByLabel(/email/i);
    this.passwordInput = page.locator('#password');
    this.loginButton = page.locator('form button[type="submit"]');
    this.authenticationError = page
      .getByRole('alert')
      .filter({ hasText: /invalid email or password/i })
      .first();
    this.emailRequiredError = page.getByText('Email is required.', {
      exact: true,
    });
    this.passwordRequiredError = page.getByText('Password is required.', {
      exact: true,
    });
  }

  async open() {
    await this.page.goto('/login');
  }

  async loginWith(email, password) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  async login(account) {
    await this.loginWith(account.email, account.password);
    await this.page.waitForLoadState('domcontentloaded');
  }
}

module.exports = { LoginPage };
