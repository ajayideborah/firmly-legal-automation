class LoginPage {
  constructor(page) {
    this.page = page;
    this.emailInput = page.getByLabel(/email/i);
    this.passwordInput = page.locator('#password');
    this.loginButton = page.locator('form button[type="submit"]');
    // The failure surfaces as a toast whose only role="alert" node is an empty
    // live-region wrapper, so match the message text instead.
    this.authenticationError = page
      .getByText(/email or password you entered is incorrect|couldn.t sign you in/i)
      .first();
    this.emailRequiredError = page.getByText('Email is required.', {
      exact: true,
    });
    this.passwordRequiredError = page.getByText('Password is required.', {
      exact: true,
    });
  }

  async open() {
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        await this.page.goto('/login');
        return;
      } catch (error) {
        const isDnsError = String(error).includes('ERR_NAME_NOT_RESOLVED');

        if (!isDnsError || attempt === 2) {
          throw error;
        }

        await this.page.waitForTimeout(2000);
      }
    }
  }

  async loginWith(email, password) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  async login(account) {
    await this.loginWith(account.email, account.password);
    await this.page.waitForURL((url) => url.pathname === '/', {
      timeout: 15_000,
    });
    await this.page.waitForLoadState('domcontentloaded');
  }
}

module.exports = { LoginPage };
