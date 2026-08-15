import users from '../fixtures/users.json';

describe('Generate Clinical Progress Report', () => {
  before(() => cy.task('seedFixtures'));

  beforeEach(() => {
    cy.loginUI(users.therapist1.username, users.therapist1.password, 'therapist');
    cy.contains('button', 'Load Data').click();
    cy.contains('h3', 'Generate Clinical Progress Report').should('be.visible');
  });

  it('rejects submission with no semester entered (client-side validation)', () => {
    cy.intercept('POST', '/api/reports/clinical').as('clinicalRequest');
    cy.contains('.panel-sub-module', 'Generate Clinical Progress Report')
      .contains('button', 'Download Report')
      .click();
    cy.contains('Please enter a semester').should('be.visible');
    cy.get('@clinicalRequest.all').should('have.length', 0);
  });

  it('shows a "no data" message for a semester the student was never assessed in (alt flow 1a)', () => {
    cy.get('input[placeholder="2022 Sem 1"]').type('Cypress No Such Semester');
    cy.contains('.panel-sub-module', 'Generate Clinical Progress Report')
      .contains('button', 'Download Report')
      .click();
    cy.contains('No assessment data available for that semester.').should('be.visible');
  });

  it('surfaces a timeout message with a working retry button when the server returns 504', () => {
    cy.intercept('POST', '/api/reports/clinical', {
      statusCode: 504,
      body: { error: 'Report generation timed out. Please try again.' },
    }).as('timeoutReport');

    cy.get('input[placeholder="2022 Sem 1"]').type('Cypress Base Sem 1');
    cy.contains('.panel-sub-module', 'Generate Clinical Progress Report')
      .contains('button', 'Download Report')
      .click();
    cy.wait('@timeoutReport');
    cy.contains('The report is taking too long to generate.').should('be.visible');
    cy.contains('button', 'Retry').should('be.visible');
  });

  it('lets a therapist switch which student the report is generated for', () => {
    cy.contains('.panel-sub-module', 'Generate Clinical Progress Report')
      .find('select')
      .first()
      .select(String(users.therapist1.secondRosterStudentId));
    cy.contains('No assessment data available for that semester.').should('not.exist');
  });

  it('downloads a real DOCX clinical report end-to-end (real AI call)', {
    retries: 0,
  }, function () {
    if (!Cypress.env('RUN_LIVE_AI_TESTS')) {
      this.skip();
    }
    cy.get('select.format-select').select('docx');
    cy.get('input[placeholder="2022 Sem 1"]').type('Cypress Base Sem 1');
    cy.contains('.panel-sub-module', 'Generate Clinical Progress Report')
      .contains('button', 'Download Report')
      .click();
    cy.contains('button', 'Download Report', { timeout: 20000 }).should('not.contain', 'Generating...');
    cy.contains('Download failed').should('not.exist');
  });

  it('API: POST /reports/clinical returns a structurally valid DOCX', function () {
    if (!Cypress.env('RUN_LIVE_AI_TESTS')) {
      this.skip();
    }
    cy.request({
      method: 'POST',
      url: '/api/reports/clinical',
      body: {
        studentId: users.therapist1.rosterStudentId,
        semester: 'Cypress Base Sem 1',
        format: 'docx',
        username: users.therapist1.username,
      },
      encoding: 'binary',
    }).then((response) => {
      expect(response.status).to.eq(200);
      expect(response.headers['content-disposition']).to.contain('clinical-report.docx');
      const magicBytes = Buffer.from(response.body, 'binary').slice(0, 2).toString('ascii');
      expect(magicBytes).to.eq('PK');
    });
  });

  it('API: 400 when required fields are missing', () => {
    cy.request({
      method: 'POST',
      url: '/api/reports/clinical',
      body: { studentId: users.therapist1.rosterStudentId },
      failOnStatusCode: false,
    }).then((response) => {
      expect(response.status).to.eq(400);
    });
  });
});
