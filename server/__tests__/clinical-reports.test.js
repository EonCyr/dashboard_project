jest.mock('mysql2', () => {
  const mockPool = {
    query: jest.fn((sql, ...args) => {
      const cb = args[args.length - 1];
      if (typeof cb === 'function') cb(null, []); // default: succeed with empty results
    }),
    promise: jest.fn(() => ({ query: jest.fn() })),
  };
  return { createPool: jest.fn(() => mockPool) };
});

const request = require('supertest');
const mysql = require('mysql2');
const { app } = require('../app');

describe('POST /reports/clinical', () => {
  const mockPool = mysql.createPool();

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  test('returns 400 if required fields are missing', async () => {
    const res = await request(app).post('/reports/clinical').send({ studentId: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Missing required fields/);
  });

  test('returns 404 when no assessment data exists for the semester (alt flow 1a)', async () => {
    mockPool.query.mockImplementation((sql, params, callback) => {
      callback(null, []);
    });

    const res = await request(app).post('/reports/clinical').send({
      studentId: 1,
      semester: '2099 Sem 1',
      format: 'pdf',
      username: 'therapist1',
    });

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/No assessment data available/);
  });

  test('returns 500 on database error', async () => {
    mockPool.query.mockImplementation((sql, params, callback) => {
      callback(new Error('DB connection lost'), null);
    });

    const res = await request(app).post('/reports/clinical').send({
      studentId: 1,
      semester: '2022 Sem 1',
      format: 'pdf',
      username: 'therapist1',
    });

    expect(res.status).toBe(500);
  });

  test('returns 504 when AI API times out (alt flow 6a)', async () => {
    mockPool.query.mockImplementation((sql, params, callback) => {
      callback(null, [
        {
          scores: JSON.stringify({
            vocab: { band: 'A' },
            'pa/phonics': { band: 'A' },
            writing: { band: 'A' },
            'listening/readingcomprehension': { band: 'A' },
          }),
          band: 'A',
          semester: '2022 Sem 1',
        },
      ]);
    });

    global.fetch.mockImplementation(() => {
      const err = new Error('The operation was aborted');
      err.name = 'AbortError';
      return Promise.reject(err);
    });

    const res = await request(app).post('/reports/clinical').send({
      studentId: 1,
      semester: '2022 Sem 1',
      format: 'pdf',
      username: 'therapist1',
    });

    expect(res.status).toBe(504);
  });

  test('generates and returns a PDF report successfully', async () => {
    mockPool.query.mockImplementation((sql, params, callback) => {
      callback(null, [
        {
          scores: JSON.stringify({
            vocab: { band: 'A' },
            'pa/phonics': { band: 'A' },
            writing: { band: 'A' },
            'listening/readingcomprehension': { band: 'A' },
          }),
          band: 'A',
          semester: '2022 Sem 1',
        },
      ]);
    });

    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ content: [{ text: 'Strong clinical progress this semester.' }] }),
    });

    const res = await request(app).post('/reports/clinical').send({
      studentId: 1,
      semester: '2022 Sem 1',
      format: 'pdf',
      username: 'therapist1',
    });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/pdf/);
    expect(res.headers['content-disposition']).toMatch(/clinical-report\.pdf/);
  });

  test('generates and returns a DOCX report successfully', async () => {
    mockPool.query.mockImplementation((sql, params, callback) => {
      callback(null, [
        {
          scores: JSON.stringify({
            vocab: { band: 'B' },
            'pa/phonics': { band: 'B' },
            writing: { band: 'B' },
            'listening/readingcomprehension': { band: 'B' },
          }),
          band: 'B',
          semester: '2022 Sem 2',
        },
      ]);
    });

    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ content: [{ text: 'Steady clinical progress.' }] }),
    });

    const res = await request(app).post('/reports/clinical').send({
      studentId: 1,
      semester: '2022 Sem 2',
      format: 'docx',
      username: 'therapist1',
    });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(
      /application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document/
    );
    expect(res.headers['content-disposition']).toMatch(/clinical-report\.docx/);
  });

});
describe('POST /reports/parent — boundary & negative cases', () => {
  const mockPool = mysql.createPool();

  beforeEach(() => {
  jest.resetAllMocks();
  global.fetch = jest.fn();
});

test('treats an unrecognized format as a plain-text fallback (finding, not a crash)', async () => {
  mockPool.query.mockImplementation((sql, params, callback) => {
    callback(null, [{ scores: JSON.stringify({ vocab: { band: 'A' }, 'pa/phonics': { band: 'A' }, writing: { band: 'A' }, 'listening/readingcomprehension': { band: 'A' } }), band: 'A', semester: '2022 Sem 1' }]);
  });
  global.fetch.mockResolvedValue({ ok: true, json: async () => ({ content: [{ text: 'Summary' }] }) });

  const res = await request(app).post('/reports/parent').send({
    studentId: 1, semester: '2022 Sem 1', format: 'exe', username: 'parent1',
  });
  expect(res.status).toBe(200);
  expect(res.headers['content-type']).toMatch(/text\/plain/);
});

test('handles a SQL-injection-shaped studentId safely', async () => {
  mockPool.query.mockImplementation((sql, params, callback) => callback(null, []));
  const res = await request(app).post('/reports/parent').send({
    studentId: 'DROP TABLE students;', semester: '2022 Sem 1', format: 'txt', username: 'parent1',
  });
  expect(res.status).toBe(404); // parameterized query treats it as a literal string — safe
});

test('handles malformed JSON in scores column gracefully (after fix)', async () => {
  mockPool.query.mockImplementation((sql, params, callback) => {
    callback(null, [{ scores: '{not valid json', band: 'A', semester: '2022 Sem 1' }]);
  });
  const res = await request(app).post('/reports/parent').send({
    studentId: 1, semester: '2022 Sem 1', format: 'txt', username: 'parent1',
  });
  expect(res.status).toBe(500);
});

test('handles studentId as an array (type confusion)', async () => {
  mockPool.query.mockImplementation((sql, params, callback) => callback(null, []));
  const res = await request(app).post('/reports/parent').send({
    studentId: [1, 2], semester: '2022 Sem 1', format: 'txt', username: 'parent1',
  });
  expect(res.status).not.toBe(200);
});
});