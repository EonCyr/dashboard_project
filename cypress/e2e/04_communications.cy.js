import users from '../fixtures/users.json';

describe('Communications thread', () => {
  const studentId = users.parent1.studentId;
  const parentId = users.parent1.userid;

  before(() => cy.task('seedFixtures'));

  afterEach(() => {
    cy.task('cleanupCommunications', { studentId, parentId });
  });

  it('parent submits a home observation and it persists', () => {
    const observation = `Cypress home observation ${Date.now()}`;

    cy.loginUI(users.parent1.username, users.parent1.password, 'parent');
    cy.contains('button', 'Load Data').click();
    cy.contains('button', 'Contact Tutor').click();

    cy.get('textarea[placeholder="Share a home observation..."]').type(observation);
    cy.contains('button', 'Submit Observation').click();

    cy.contains(observation).should('be.visible');
  });

  it('therapist submits a professional recommendation, and it is cross-role visible to the parent', () => {
    const recommendation = `Cypress clinical recommendation ${Date.now()}`;

    // Therapist submits via the "Message Parents" broadcast/thread tool
    cy.loginUI(users.therapist1.username, users.therapist1.password, 'therapist');
    cy.contains('button', 'Message Parents').click();
    // formatParentLabel() in MessageParentsModal.jsx turns 'cypress_parent1' into 'Cypress Parent1'.
    cy.contains('.parent-row', 'Cypress Parent1').contains('button', 'Open thread').click();

    cy.get('textarea[placeholder="Add a professional recommendation..."]').type(recommendation);
    cy.contains('button', 'Submit Recommendation').click();
    cy.contains(recommendation).should('be.visible');
    cy.get('.modal-close-x').click();

    // Parent reads the same thread and sees it
    cy.loginUI(users.parent1.username, users.parent1.password, 'parent');
    cy.contains('button', 'Load Data').click();
    cy.contains('button', 'Contact Tutor').click();
    cy.contains(recommendation).should('be.visible');
    cy.contains('🩺 Therapist').should('be.visible');
  });

  it('API: rejects a message over 2000 characters', () => {
    cy.request({
      method: 'POST',
      url: '/api/communications',
      body: {
        studentId,
        parentId,
        senderUsername: users.parent1.username,
        senderRole: 'parent',
        message: 'x'.repeat(2001),
      },
      failOnStatusCode: false,
    }).then((response) => {
      expect(response.status).to.eq(400);
    });
  });

  it('API: rejects an empty/whitespace-only message', () => {
    cy.request({
      method: 'POST',
      url: '/api/communications',
      body: {
        studentId,
        parentId,
        senderUsername: users.parent1.username,
        senderRole: 'parent',
        message: '   ',
      },
      failOnStatusCode: false,
    }).then((response) => {
      expect(response.status).to.eq(400);
    });
  });

  it('API: rejects an invalid sender role', () => {
    cy.request({
      method: 'POST',
      url: '/api/communications',
      body: {
        studentId,
        parentId,
        senderUsername: users.parent1.username,
        senderRole: 'admin',
        message: 'hello',
      },
      failOnStatusCode: false,
    }).then((response) => {
      expect(response.status).to.eq(400);
    });
  });
});
