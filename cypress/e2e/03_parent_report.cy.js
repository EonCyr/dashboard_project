import users from '../fixtures/users.json';

describe('Generate Progress Report (Parent)', () => {
  before(() => cy.task('seedFixtures'));

  beforeEach(() => {
    cy.loginUI(users.parent1.username, users.parent1.password, 'parent');
    cy.contains('button', 'Load Data').click();
    cy.contains(`Student ID: ${users.parent1.studentId}`).should('be.visible');
  });

  it('rejects submission with no semester entered (client-side validation, alt flow)', () => {
    cy.intercept('POST', '/api/reports/parent').as('reportRequest');
    cy.contains('button', 'Download Report').click();
    cy.contains('Please enter a semester').should('be.visible');
    cy.get('@reportRequest.all').should('have.length', 0);
  });

  it('shows a "no data" message for a semester the student was never assessed in (alt flow 1a)', () => {
    cy.get('input[placeholder="2022 Sem 1"]').type('Cypress No Such Semester');
    cy.contains('button', 'Download Report').click();
    cy.contains('No assessment data available for that semester.').should('be.visible');
  });

  it('surfaces a timeout message with a working retry button when the server returns 504', () => {
    cy.intercept('POST', '/api/reports/parent', {
      statusCode: 504,
      body: { error: 'Report generation timed out. Please try again.' },
    }).as('timeoutReport');

    cy.get('input[placeholder="2022 Sem 1"]').type('Cypress Base Sem 1');
    cy.contains('button', 'Download Report').click();
    cy.wait('@timeoutReport');
    cy.contains('The report is taking too long to generate.').should('be.visible');
    cy.contains('button', 'Retry').should('be.visible');

    // Retry re-fires the same request rather than getting stuck.
    cy.intercept('POST', '/api/reports/parent', {
      statusCode: 504,
      body: { error: 'Report generation timed out. Please try again.' },
    }).as('timeoutReport2');
    cy.contains('button', 'Retry').click();
    cy.wait('@timeoutReport2');
  });

  it('surfaces a generic error with retry when the server 5xxs', () => {
    cy.intercept('POST', '/api/reports/parent', { statusCode: 502, body: {} }).as('errorReport');
    cy.get('input[placeholder="2022 Sem 1"]').type('Cypress Base Sem 1');
    cy.contains('button', 'Download Report').click();
    cy.wait('@errorReport');
    cy.contains('Download failed. Please try again.').should('be.visible');
    cy.contains('button', 'Retry').should('be.visible');
  });

  it('downloads a real TXT report end-to-end (real AI call)', {
    retries: 0,
  }, function () {
    if (!Cypress.env('RUN_LIVE_AI_TESTS')) {
      this.skip();
    }
    cy.get('select.format-select').select('docx'); // format select only offers pdf/docx in the UI
    cy.get('input[placeholder="2022 Sem 1"]').type('Cypress Base Sem 1');
    cy.contains('button', 'Download Report').click();
    // Generation can legitimately take several seconds 
    cy.contains('button', 'Download Report', { timeout: 20000 }).should('not.contain', 'Generating...');
    cy.contains('Download failed').should('not.exist');
  });

  // Direct API check of the actual file response
  it('API: POST /reports/parent returns a well-formed TXT file for a real semester', function () {
    if (!Cypress.env('RUN_LIVE_AI_TESTS')) {
      this.skip();
    }
    cy.request({
      method: 'POST',
      url: '/api/reports/parent',
      body: {
        studentId: users.parent1.studentId,
        semester: 'Cypress Base Sem 1',
        format: 'txt',
        username: users.parent1.username,
      },
      encoding: 'binary',
    }).then((response) => {
      expect(response.status).to.eq(200);
      expect(response.headers['content-disposition']).to.contain('progress-report.txt');
      expect(response.body.length).to.be.greaterThan(0);
    });
  });

  it('API: 400 when required fields are missing', () => {
    cy.request({
      method: 'POST',
      url: '/api/reports/parent',
      body: { studentId: users.parent1.studentId },
      failOnStatusCode: false,
    }).then((response) => {
      expect(response.status).to.eq(400);
    });
  });
});
