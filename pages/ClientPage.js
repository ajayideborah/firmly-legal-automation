const { expect } = require('@playwright/test');

class ClientPage {
  constructor(page) {
    this.page = page;
    this.heading = page.getByRole('heading', {
      name: 'Client Management',
      exact: true,
    });
    this.addClientButton = page.getByRole('button', { name: 'Add New Client' });
    this.table = page.getByRole('table').first();
    this.conflictMessage = page.getByRole('heading', {
      name: 'Potential conflict detected with an existing client',
    });
  }

  // The URL pattern deliberately excludes /clients/new so that this cannot
  // report success while the creation wizard is still open.
  async open() {
    await this.page.getByRole('link', { name: 'Client Management' }).click();
    await this.page.waitForURL(/\/clients(?:\?|$)/);
    await expect(this.heading).toBeVisible();
  }

  // The summary can still show the pre-creation total just after a client is
  // added, so reload to make sure the number read here is authoritative.
  async getTotalClients() {
    await this.page.reload();
    await expect(this.table).toBeVisible({ timeout: 30000 });

    const summary = this.page.getByText(/showing.*of\s+\d+/i).last();
    await expect(summary).toBeVisible({ timeout: 15000 });

    await expect.poll(async () => {
      const currentText = await summary.innerText();
      return Number(currentText.match(/of\s+(\d+)/i)?.[1] || 0);
    }, { timeout: 15000 }).toBeGreaterThan(0);

    const text = await summary.innerText();
    return Number(text.match(/of\s+(\d+)/i)?.[1]);
  }

  async startCreation(type) {
    await this.addClientButton.click();
    await this.page.waitForURL(/\/clients\/new/);

    await this.page
      .getByRole('button', { name: new RegExp(`^${type}$`, 'i') })
      .click();
  }

  async fillCommonFields(client) {
    await this.page.getByRole('textbox', { name: 'Enter email address' }).fill(client.email);
    await this.page.getByRole('textbox', { name: 'Enter phone number' }).fill(client.phone);
    await this.page.getByRole('textbox', { name: 'Enter address' }).fill(client.address);
    await this.selectState(client.state);
    await this.selectLga(client.lga);
    await this.page
      .getByRole('textbox', { name: /nature of business|occupation field/i })
      .fill(client.natureOfBusiness);
    await this.page.getByRole('textbox', { name: 'E.g. Debt Recovery' })
      .fill(client.legalMatter);
    await this.assignLawyer();
  }

  // These dropdowns are Radix triggers with no accessible name and their
  // labels carry no "for" attribute, so scope by the label's field wrapper.
  fieldDropdown(labelText) {
    return this.page
      .locator('label', { hasText: new RegExp(`^${labelText}\\s*\\*?$`) })
      .locator('..')
      .getByRole('combobox');
  }

  async selectFromDropdown(labelText, optionName) {
    const trigger = this.fieldDropdown(labelText);
    await expect(trigger).toBeEnabled({ timeout: 30000 });
    await trigger.click();
    await this.chooseOption(optionName);
  }

  async selectState(stateName) {
    await this.selectFromDropdown('State', stateName);
  }

  // The LGA trigger stays disabled until a state has been chosen.
  async selectLga(lgaName) {
    await this.selectFromDropdown('LGA', lgaName);
  }

  async assignLawyer(lawyerName) {
    await this.selectFromDropdown('Assign Lawyer', lawyerName);
  }

  async chooseOption(optionName) {
    if (optionName) {
      const preferred = this.page.getByRole('option', { name: optionName, exact: true });

      if (await preferred.isVisible().catch(() => false)) {
        await preferred.click();
        return;
      }
    }

    await this.page.getByRole('option').first().click();
  }

  async createIndividual(client, completeCreation = true) {
    await this.startCreation('individual');
    await this.page.getByRole('textbox', { name: 'Enter first name' }).fill(client.firstName);
    await this.page.getByRole('textbox', { name: 'Enter last name' }).fill(client.lastName);
    await this.fillCommonFields(client);
    await this.runConflictCheck();
    if (completeCreation) {
      await this.completeClientCreation();
    }
  }

  async createCorporate(client, identificationPath, completeCreation = true) {
    await this.startCreation('corporate');
    await this.page.getByRole('textbox', { name: 'Enter company name' })
      .fill(client.companyName);
    await this.page.getByRole('textbox', { name: 'Enter CAC number' })
      .fill(client.cacNumber);
    await this.page.getByRole('textbox', {
      name: 'Enter directors name (comma separated)',
    }).fill(client.directors);

    const contactPerson = this.page.getByRole('textbox', {
      name: 'Enter contact person name',
    });
    if (await contactPerson.isVisible().catch(() => false)) {
      await contactPerson.fill(client.contactPerson);
    }

    await this.fillCommonFields(client);
    await this.uploadIdentification(identificationPath);
    await this.runConflictCheck();
    if (completeCreation) {
      await this.completeClientCreation();
    }
  }

  // Only corporate clients still require an identification document.
  // The upload accepts .pdf, .png, .jpg and .jpeg only.
  async uploadIdentification(identificationPath) {
    if (!identificationPath) {
      throw new Error('A corporate client requires an identification file.');
    }

    const input = this.page.locator('input[type="file"]').first();
    await expect(input).toBeAttached({ timeout: 15000 });
    await input.setInputFiles(identificationPath);
  }

  async runConflictCheck() {
    await this.page.getByRole('button', { name: 'Run Conflict Check' }).click();
  }

  async completeClientCreation(documentPath) {
    // Step 2: a new client must be cleared of conflicts before creation continues.
    await expect(
      this.page.getByText(/no conflict|no potential conflict|no match found/i).first(),
    ).toBeVisible({ timeout: 30000 });
    await this.clickStepButton('Proceed');

    await this.completeRemainingSteps(documentPath);
  }

  async completeRemainingSteps(documentPath) {
    // Step 3: review and send the engagement letter.
    await expect(
      this.page.getByText('Engagement Letter Preview').first(),
    ).toBeVisible({ timeout: 60000 });
    await this.clickStepButton('Send To Client');

    // Step 4: calendar booking is optional for this scenario.
    await this.clickStepButton('Skip for now');
    await this.clickStepButton('Yes, skip for now');

    // Step 5: the supporting document is optional, so only upload when given one.
    const completeButton = this.page.getByRole('button', {
      name: 'Complete Client Setup',
    });
    await expect(completeButton).toBeVisible({ timeout: 30000 });

    if (documentPath) {
      const documentInput = this.page.locator('input[type="file"]').first();
      await expect(documentInput).toBeAttached({ timeout: 15000 });
      await documentInput.setInputFiles(documentPath);
    }

    await completeButton.click();

    // Step 6: creating a case straight away is optional.
    await this.clickStepButton('Skip for Now');
    await this.clickStepButton('Return to Client');

    await this.page.waitForURL(/\/clients(?:\?|$)/, { timeout: 20000 });
    await expect(this.table).toBeVisible();
  }

  // The conflict modal now links straight to a dedicated review page at
  // /clients/conflicts-review?clientCode=...
  async openConflictResolution() {
    await expect(this.conflictMessage).toBeVisible({ timeout: 30000 });
    await this.page
      .getByRole('button', { name: 'View Conflict Details and Resolve' })
      .click();

    await this.page.waitForURL(/\/clients\/conflicts-review/, { timeout: 30000 });
    await expect(
      this.page.getByRole('heading', { name: 'Conflict Review' }),
    ).toBeVisible({ timeout: 30000 });
  }

  // The resolution radios carry no accessible name, so click the option title.
  async resolveConflict(resolution, adminNote) {
    await this.openConflictResolution();

    await this.page.getByText(resolution, { exact: true }).first().click();

    const note = this.page.getByPlaceholder(
      'Explain your decision and provide any relevant context...',
    );
    await expect(note).toBeVisible();
    await note.fill(adminNote);

    // Submission stays disabled until both a resolution and the note are set.
    const submit = this.page.getByRole('button', {
      name: 'Resolve Conflict',
      exact: true,
    });
    await expect(submit).toBeEnabled({ timeout: 15000 });
    await submit.click();

    if (/reassign/i.test(resolution)) {
      await this.completeReassignment();
    }
  }

  // Reassignment asks for the new lawyer in a dialog raised after submitting.
  async completeReassignment() {
    const dialog = this.page.getByRole('dialog').filter({ hasText: 'Reassign Case' });
    await expect(dialog).toBeVisible({ timeout: 30000 });

    await dialog.getByRole('combobox').click();
    await this.page.getByRole('option').first().click();

    await dialog.getByRole('button', { name: 'Reassign Case', exact: true }).click();
  }

  async continueAfterNoConflict(documentPath) {
    await this.clickStepButton('Proceed');
    await this.completeRemainingSteps(documentPath);
  }

  clientRow(client) {
    return this.table.getByRole('row')
      .filter({ hasText: new RegExp(client.email, 'i') })
      .first();
  }

  // Sending the waiver creates the client with a "Waiver Sent" status, so the
  // flow is complete once that row appears. Signing is a separate journey.
  async completeWaiverResolution(client) {
    await this.clickStepButton('Review Waiver Letter');
    await this.page.waitForURL(/\/clients\/waiver/, { timeout: 30000 });
    await expect(
      this.page.getByText('Conflict Waiver Letter Preview'),
    ).toBeVisible({ timeout: 30000 });

    await this.clickStepButton('Send To Client');
    await this.page.waitForURL(/\/clients(?:\?|$)/, { timeout: 30000 });

    await expect(this.clientRow(client))
      .toContainText(/waiver sent/i, { timeout: 30000 });
  }

  async markWaiverSigned(client) {
    const row = this.clientRow(client);
    await expect(row).toBeVisible({ timeout: 30000 });
    await row.getByRole('button').last().click();
    await this.page.getByRole('menuitem', { name: 'Mark Waiver Signed' }).click();

    // The signature check asks a question before enabling Confirm.
    await this.page.getByRole('button', { name: 'Yes, signed', exact: true }).click();
    const confirm = this.page.getByRole('button', { name: 'Confirm', exact: true });
    await expect(confirm).toBeEnabled({ timeout: 15000 });
    await confirm.click();
  }

  async expectResolutionSubmitted() {
    await expect(
      this.page
        .getByText('Action Completed')
        .or(this.page.getByRole('button', { name: 'Proceed', exact: true }))
        .or(this.page.getByText(/conflict.*resolved|resolution.*submitted|successfully/i))
        .first(),
    ).toBeVisible({ timeout: 30000 });
  }

  async clickStepButton(name) {
    const button = this.page.getByRole('button', { name }).last();
    await expect(button).toBeVisible({ timeout: 30000 });
    await button.click();
  }

  async clickStepButtonIfVisible(name) {
    const button = this.page.getByRole('button', { name }).last();
    if (await button.isVisible({ timeout: 5000 }).catch(() => false)) {
      await button.click();
    }
  }

  async dismissConflict() {
    await this.page.getByRole('button', { name: 'Dismiss and go back' }).click();
  }

  async expectClientVisible(client) {
    await expect(
      this.table.getByText(client.email, { exact: true }).or(
        this.table.getByText(client.phone, { exact: true }),
      ).first(),
    ).toBeVisible();
  }
}

module.exports = { ClientPage };
