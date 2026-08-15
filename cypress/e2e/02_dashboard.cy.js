import users from '../fixtures/users.json';

describe('Generate Progress Dashboard (therapist view)', () => {
  before(() => cy.task('seedFixtures'));

  beforeEach(() => {
    cy.loginUI(users.therapist1.username, users.therapist1.password, 'therapist');
  });

  it('shows an empty state before data is loaded', () => {
    cy.contains('No student data loaded').should('be.visible');
  });

  it('loads and renders the student roster table', () => {
    cy.contains('button', 'Load Data').click();
    cy.get('table.student-table tbody tr').should('have.length.greaterThan', 0);
    cy.contains('td.student-id-cell', String(users.therapist1.rosterStudentId)).should('be.visible');
  });

  it('filters the loaded roster by student ID', () => {
    cy.contains('button', 'Load Data').click();
    cy.get('table.student-table tbody tr').should('have.length.greaterThan', 1);

    cy.get('input[placeholder*="Search by ID"]').type(String(users.therapist1.rosterStudentId));
    cy.get('table.student-table tbody tr').should('have.length', 1);
    cy.contains('td.student-id-cell', String(users.therapist1.rosterStudentId)).should('be.visible');
  });

  it('shows a "no match" message when the filter matches nothing', () => {
    cy.contains('button', 'Load Data').click();
    cy.get('input[placeholder*="Search by ID"]').type('no-such-student-xyz');
    cy.contains(/No students match/i).should('be.visible');
  });
});

describe('Generate Progress Dashboard (parent view)', () => {
  before(() => cy.task('seedFixtures'));

  it('renders progress data for a parent with an assessed child', () => {
    cy.loginUI(users.parent1.username, users.parent1.password, 'parent');
    cy.contains('button', 'Load Data').click();
    cy.contains(`Student ID: ${users.parent1.studentId}`).should('be.visible');
    cy.contains('Overall Band:').should('be.visible');
  });

  // No assessment data entered yet.
  it('handles a linked child with zero assessments without crashing', () => {
    cy.loginUI(users.parentEmpty.username, users.parentEmpty.password, 'parent');
    cy.contains('button', 'Load Data').click();
    cy.contains(`Student ID: ${users.parentEmpty.studentId}`).should('be.visible');
  });
});
