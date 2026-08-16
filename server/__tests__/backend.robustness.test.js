const request = require('supertest');
const { app, pool } = require('../app'); // Adjust relative path to your Express app file

afterAll((done) => {
  // End the mysql connection pool if method exists
  if (pool && pool.end) {
    pool.end(done);
  } else {
    done();
  }
});
// Mock the MySQL pool so tests execute without a live database connection
jest.mock('mysql2', () => {
  const mPromisePool = {
    query: jest.fn(),
  };
  const mPool = {
    query: jest.fn(),
    promise: () => mPromisePool,
  };
  return {
    createPool: jest.fn(() => mPool),
  };
});

describe('Backend Robustness & Edge Case Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /* -------------------------------------------------------------------------- */
  /*  1. Dynamic Risk Config Endpoints (/config/risk)                           */
  /* -------------------------------------------------------------------------- */
  describe('GET & PUT /config/risk Boundaries', () => {
    it('handles database rejection gracefully on GET /config/risk (500)', async () => {
      pool.promise().query.mockRejectedValueOnce(new Error('Database Connection Lost'));

      const response = await request(app).get('/config/risk');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Failed to fetch risk configurations.' });
    });

    it('rejects invalid threshold math where Critical >= Moderate on PUT /config/risk (400)', async () => {
      const invalidPayload = {
        criticalScore: 25, // Critical is GREATER than Moderate
        moderateScore: 20,
        highPerformerScore: 30,
        baselineWindow: 2,
      };

      const response = await request(app).put('/config/risk').send(invalidPayload);

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/Validation Error/i);
    });

    it('rejects equal boundaries where Moderate == High Performer (400)', async () => {
      const invalidPayload = {
        criticalScore: 10,
        moderateScore: 25,
        highPerformerScore: 25, // Equal scores
        baselineWindow: 2,
      };

      const response = await request(app).put('/config/risk').send(invalidPayload);

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/Validation Error/i);
    });

    it('handles SQL execution errors on PUT /config/risk (500)', async () => {
      pool.promise().query.mockRejectedValueOnce(new Error('DB Write Lock Timeout'));

      const validPayload = {
        criticalScore: 10,
        moderateScore: 20,
        highPerformerScore: 30,
        baselineWindow: 2,
      };

      const response = await request(app).put('/config/risk').send(validPayload);

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Database update failed.' });
    });
  });

  /* -------------------------------------------------------------------------- */
  /*  2. Parent-Therapist Communications (/communications)                     */
  /* -------------------------------------------------------------------------- */
  describe('POST /communications Robustness Checks', () => {
    it('returns 400 when required payload properties are missing', async () => {
      const incompletePayload = {
        studentId: 'STU001',
        senderUsername: 'therapist1',
        // Missing parentId, senderRole, and message
      };

      const response = await request(app).post('/communications').send(incompletePayload);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Missing required fields' });
    });

    it('rejects unauthorized or unknown sender roles (400)', async () => {
      const invalidRolePayload = {
        studentId: 'STU001',
        parentId: 'PAR001',
        senderUsername: 'hacker123',
        senderRole: 'admin_override', // Invalid role
        message: 'Hello world',
      };

      const response = await request(app).post('/communications').send(invalidRolePayload);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Invalid sender role' });
    });

    it('rejects empty/whitespace-only messages (400)', async () => {
      const emptyMsgPayload = {
        studentId: 'STU001',
        parentId: 'PAR001',
        senderUsername: 'therapist1',
        senderRole: 'therapist',
        message: '     ', // Whitespace
      };

      const response = await request(app).post('/communications').send(emptyMsgPayload);

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/between 1 and 2000 characters/i);
    });

    it('rejects messages exceeding the 2000 character limit (400)', async () => {
      const longMsgPayload = {
        studentId: 'STU001',
        parentId: 'PAR001',
        senderUsername: 'therapist1',
        senderRole: 'therapist',
        message: 'A'.repeat(2001), // Exceeds limit
      };

      const response = await request(app).post('/communications').send(longMsgPayload);

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/between 1 and 2000 characters/i);
    });
  });

  /*  3. Assessment Entries & File Uploads (/assessments)                       */
  describe('/assessments Edge Cases', () => {
    it('returns 404 when adding single assessment for non-existent student', async () => {
      // Mock student check returning empty rows
      pool.promise().query.mockResolvedValueOnce([[]]);

      const payload = {
        studentId: 'NON_EXISTENT_999',
        semester: '2026-S1',
        scores: { vocab: 10 },
      };

      const response = await request(app).post('/assessments/single').send(payload);

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Student ID not found in database.' });
    });

    it('returns 400 when bulk import endpoint receives no file attachment', async () => {
      const response = await request(app).post('/assessments/bulk-import');

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'No file uploaded.' });
    });
  });

  /*  4. AI & Report Generation Timeout & Corruption Handling                    */
  describe('/reports/parent-summary Robustness', () => {
    it('returns 500 when assessment scores column contains corrupted non-JSON strings', async () => {
      const mockCorruptedRow = [{
        scores: '{{INVALID_JSON_CORRUPTED_STRING',
        band: 'Band A',
        semester: '2026-S1',
      }];

      pool.query.mockImplementationOnce((sql, params, cb) => {
        cb(null, mockCorruptedRow);
      });

      const response = await request(app).get('/reports/parent-summary/STU001');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Corrupted assessment data.' });
    });
  });
});