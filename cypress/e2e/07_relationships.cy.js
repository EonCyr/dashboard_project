import users from '../fixtures/users.json';

describe('Manage Student-Parent Profile Link', () => {
  before(() => cy.task('seedFixtures'));

  beforeEach(() => {
    cy.loginUI(users.therapist1.username, users.therapist1.password, 'therapist');
    cy.contains('button', 'Manage Parent-Student Relationship').click();
    cy.contains('h3', 'Parent-Student Relationship Manager').should('be.visible');
  });

  it('shows the current relationships for the therapist\'s own roster on open', () => {
    cy.contains('li', `Student ${users.therapist1.rosterStudentId} → Parent ${users.parent1.userid}`).should(
      'be.visible'
    );
    // student2 (900003) has no linked parent yet.
    cy.contains('li', `Student ${users.therapist1.secondRosterStudentId} → Parent N/A`).should('be.visible');
  });

  it('rejects submission with a missing student or parent ID', () => {
    cy.get('input[placeholder="Parent ID"]').type(String(users.parentUnlinked.userid));
    cy.contains('button', 'Add Link').click();
    cy.contains('Please enter both a student ID and a parent ID.').should('be.visible');
  });

  it('rejects "Add Link" with no relationship selected', () => {
    cy.get('input[placeholder="Student ID"]').type(String(users.therapist1.secondRosterStudentId));
    cy.get('input[placeholder="Parent ID"]').type(String(users.parentUnlinked.userid));
    cy.contains('button', 'Add Link').click();
    cy.contains('Please select a relationship.').should('be.visible');
  });
});
