const { expect } = require('@playwright/test');

class FirmOnboardingPage {
  constructor(page) {
    this.page = page;
  }

  async openFromLogin() {
    await this.page.goto('/login');
    await this.page
      .getByRole('link', { name: 'Sign Up', exact: true })
      .click();
    await this.page.waitForURL(/\/signup\?step=identity/);
  }

  async selectLawFirm() {
    await this.page.getByRole('radio', { name: /Law Firm/ }).click();
    const continueButton = this.page.getByRole('button', {
      name: 'Continue',
      exact: true,
    });

    await expect(continueButton).toBeEnabled();
    await continueButton.click();
    await this.page.waitForURL(/\/signup\?step=info&identity=law-firm/);
  }

  async fillFirmInformation(firm, submit = true) {
    await this.page.getByLabel('Firm Legal Name').fill(firm.legalName);

    await this.page.getByRole('button', { name: 'Select firm type' }).click();
    await this.page.getByRole('button', { name: 'Law Firm', exact: true }).click();

    await this.page.getByLabel('Email').fill(firm.email);
    await this.page.getByLabel('Phone Number').fill(firm.phone);
    await this.page.getByLabel('Address').fill(firm.address);

    await this.page.getByRole('combobox', { name: 'State' }).click();
    await this.page.getByRole('option', { name: firm.state }).click();

    if (submit) {
      await this.continue();
    }
  }

  async continue() {
    await this.page.getByRole('button', { name: 'Continue', exact: true }).click();
  }

  async enterVerificationCode(code) {
    await expect(
      this.page.getByText('Step 2 of 4', { exact: true }),
    ).toBeVisible();

    const codeInputs = this.page
      .getByRole('region', { name: 'Email verification' })
      .getByRole('textbox');
    await expect(codeInputs).toHaveCount(5);
    const inputCount = await codeInputs.count();

    for (const [index, digit] of [...code].slice(0, inputCount).entries()) {
      await codeInputs.nth(index).fill(digit);
    }

    await this.page.getByRole('button', { name: /verify|continue/i }).click();
  }

  async setPassword(password) {
    const passwordInputs = this.page.locator('input[type="password"]');
    await passwordInputs.first().fill(password);

    if ((await passwordInputs.count()) > 1) {
      await passwordInputs.nth(1).fill(password);
    }

    await this.page.getByRole('button', { name: /continue|create account/i }).click();
    const planStep = this.page.getByText('Step 4 of 4', { exact: true });
    const serverError = this.page
      .getByRole('alert')
      .filter({ hasText: /failed|error|unable|try again/i })
      .first();

    await expect(planStep.or(serverError)).toBeVisible({ timeout: 60_000 });

    if (await serverError.isVisible()) {
      throw new Error(`Password setup failed: ${await serverError.innerText()}`);
    }
  }

  async fillPassword(password) {
    const passwordInputs = this.page.locator('input[type="password"]');
    await passwordInputs.first().fill(password);
    await passwordInputs.nth(1).fill(password);
  }

  async submitPassword() {
    await this.page
      .getByRole('button', { name: /continue|create account/i })
      .click();
  }

  async expectPlanSelection() {
    await expect(
      this.page.getByRole('heading', { name: /plan|subscription/i }),
    ).toBeVisible();
  }
}

module.exports = { FirmOnboardingPage };
