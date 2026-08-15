import users from '../fixtures/users.json';

describe('Configure Risk Assessment Metrics', () => {
  before(() => cy.task('seedFixtures'));

  beforeEach(() => {
    cy.loginUI(users.therapist1.username, users.therapist1.password, 'therapist');
    cy.contains('button', 'Configure Risk Thresholds').click();
    cy.contains('h3', 'Configure Risk Assessment Metrics').should('be.visible');
  });

  it('rejects an invalid threshold ordering (critical must be < moderate < high performer)', () => {
    cy.get('#critical-score').clear().type('30');
    cy.get('#moderate-score').clear().type('25'); // moderate < critical — invalid
    cy.get('#high-score').clear().type('29');
    cy.contains('button', /^Save Band/).click();
    cy.contains(/must follow Critical < Moderate < High Performer/i).should('be.visible');
  });

  it('rejects moderate >= high performer', () => {
    cy.get('#critical-score').clear().type('20');
    cy.get('#moderate-score').clear().type('30');
    cy.get('#high-score').clear().type('28'); // high < moderate — invalid
    cy.contains('button', /^Save Band/).click();
    cy.contains(/must follow Critical < Moderate < High Performer/i).should('be.visible');
  });

  it('API: confirms GET /config/risk\'s response shape does not match what the UI expects (per-band A/B/C)', () => {
    cy.request('/api/config/risk').then((response) => {
      expect(response.status).to.eq(200);
      expect(response.body).to.have.property('critical_score'); // what the server actually sends
      expect(response.body).not.to.have.property('A'); // what RiskConfigModal actually reads
    });
  });
});