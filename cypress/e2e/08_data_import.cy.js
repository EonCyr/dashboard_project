import users from '../fixtures/users.json';

describe('Data Import', () => {
  before(() => cy.task('seedFixtures'));

  beforeEach(() => {
    cy.loginUI(users.therapist1.username, users.therapist1.password, 'therapist');
    cy.openAddAssessmentModal();
    cy.contains('button', 'Mass Import (File)').click();
  });

  it('rejects a corrupt/unreadable file', () => {
    cy.get('input[type="file"]').selectFile('cypress/fixtures/corrupt-import.xlsx', { force: true });
    cy.contains('button', 'Upload & Process Mass Import').click();
    cy.contains('Bulk upload failed', { timeout: 15000 }).should('be.visible');
  });

  it('imports a valid spreadsheet end-to-end and the student becomes visible on the roster', () => {
    let studentId;
    cy.task('buildValidImportFile').then((result) => {
      studentId = result.studentId;
      cy.get('input[type="file"]').selectFile(result.path, { force: true });
    });

    cy.contains('button', 'Upload & Process Mass Import').click();
    cy.contains('Mass file imported successfully!', { timeout: 20000 }).should('be.visible');

    cy.contains('h3', 'Add New Assessment', { timeout: 5000 }).should('not.exist');
    cy.then(() => {
      cy.request(`/api/students?role=therapist&username=${users.therapist1.username}`).then((response) => {
        const imported = response.body.find((s) => String(s.studentid) === String(studentId));
        expect(imported, 'imported student should now be on the therapist roster').to.exist;
      });
    });

    cy.then(() => cy.task('cleanupImportedStudent', studentId));
  });

  it('requires a file to be selected before the upload button is enabled', () => {
    cy.contains('button', 'Upload & Process Mass Import').should('be.disabled');
  });

  it('a spreadsheet silently imports the student as "Unknown"', () => {
    let studentId;
    cy.task('buildRealisticImportFile').then((result) => {
      studentId = result.studentId;
      cy.get('input[type="file"]').selectFile(result.path, { force: true });
    });

    cy.contains('button', 'Upload & Process Mass Import').click();
    cy.contains('Mass file imported successfully!', { timeout: 20000 }).should('be.visible');

    cy.then(() => {
      cy.request(`/api/students?role=therapist&username=${users.therapist1.username}`).then((response) => {
        const imported = response.body.find((s) => String(s.studentid) === String(studentId));
        expect(imported, 'imported student should be on the roster').to.exist;
      });
    });

    cy.then(() => {
      cy.task('queryOne', `SELECT name FROM students WHERE studentid = ${Number(studentId)}`).then((row) => {
        expect(row.name).to.eq('Unknown');
      });
    });

    cy.then(() => cy.task('cleanupImportedStudent', studentId));
  });
});
