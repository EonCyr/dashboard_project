import users from '../fixtures/users.json';

describe('Login', () => {
  before(() => cy.task('seedFixtures'));

  beforeEach(() => cy.visit('/'));

  it('rejects an unknown username', () => {
    cy.loginUI('not_a_real_user', 'whatever', 'therapist');
    cy.contains(/invalid username, password, or role/i).should('be.visible');
  });

  it('rejects a known username with the wrong password', () => {
    cy.loginUI(users.therapist1.username, 'totally-wrong-password', 'therapist');
    cy.contains(/invalid username, password, or role/i).should('be.visible');
  });

  it('rejects correct credentials submitted with the wrong role', () => {
    cy.loginUI(users.therapist1.username, users.therapist1.password, 'parent');
    cy.contains(/invalid username, password, or role/i).should('be.visible');
  });

  it('logs a therapist in and shows the therapist dashboard', () => {
    cy.loginUI(users.therapist1.username, users.therapist1.password, 'therapist');
    cy.contains('h1', 'Therapist Management Dashboard').should('be.visible');
  });

  it('logs a parent in and shows the parent dashboard', () => {
    cy.loginUI(users.parent1.username, users.parent1.password, 'parent');
    cy.contains('h1', 'Parent Progress Portal').should('be.visible');
  });

  it('does not persist login across a page reload (no session layer exists)', () => {
    cy.loginUI(users.therapist1.username, users.therapist1.password, 'therapist');
    cy.contains('h1', 'Therapist Management Dashboard').should('be.visible');
    cy.reload();
    cy.contains('h2', 'Dashboard Login').should('be.visible');
  });
});
