Cypress.Commands.add('loginUI', (username, password, role) => {
  cy.visit('/');
  cy.get('input[placeholder="Username"]').clear().type(username);
  cy.get('input[placeholder="Password"]').clear().type(password);
  cy.get('form.login-card select').select(role);
  cy.get('form.login-card button[type="submit"]').click();
});

Cypress.Commands.add('openAddAssessmentModal', () => {
  cy.contains('button', 'Add New Assessment').click();
  cy.contains('h3', 'Add New Assessment').should('be.visible');
});
