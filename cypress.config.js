const { defineConfig } = require('cypress');
const dbTasks = require('./cypress/support/db-tasks');

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:5173',
    specPattern: 'cypress/e2e/**/*.cy.js',
    supportFile: 'cypress/support/e2e.js',
    video: false,
    defaultCommandTimeout: 10000,
    requestTimeout: 20000,
    retries: { runMode: 1, openMode: 0 },
    setupNodeEvents(on, config) {
      const { FIXTURE_IDS, ...taskHandlers } = dbTasks;
      on('task', taskHandlers);
      config.env.FIXTURE_IDS = FIXTURE_IDS;
      return config;
    },
  },
});
