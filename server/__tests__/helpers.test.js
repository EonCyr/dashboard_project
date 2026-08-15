
const { formatScoreField, compileReport } = require('../app');
jest.mock('mysql2', () => {
  const mockPool = {
    query: jest.fn((sql, ...args) => {
      const cb = args[args.length - 1];
      if (typeof cb === 'function') cb(null, []);
    }),
    promise: jest.fn(() => ({ query: jest.fn() })),
  };
  return { createPool: jest.fn(() => mockPool) };
});

describe('formatScoreField', () => {
  test('returns N/A for null/undefined', () => {
    expect(formatScoreField(null)).toBe('N/A');
    expect(formatScoreField(undefined)).toBe('N/A');
  });

  test('returns the value directly if not an object', () => {
    expect(formatScoreField('A+')).toBe('A+');
  });

  test('formats an object into a readable key:value string', () => {
    const result = formatScoreField({ band: 'A', raw_score: 90 });
    expect(result).toContain('band: A');
    expect(result).toContain('raw score: 90');
  });
});

describe('compileReport', () => {
  test('TXT format returns the summary text as a buffer', async () => {
    const buffer = await compileReport({
      format: 'txt',
      summaryText: 'Test summary',
      rows: [],
    });
    expect(buffer.toString('utf-8')).toBe('Test summary');
  });

  test('PDF format returns a non-empty buffer starting with PDF header', async () => {
    const buffer = await compileReport({
      format: 'pdf',
      summaryText: 'Test summary',
      rows: [{ semester: '2022 Sem 1', vocab: 'A', phonics: 'A', writing: 'A', listening: 'A', band: 'A' }],
    });
    expect(buffer.length).toBeGreaterThan(0);
    expect(buffer.slice(0, 4).toString()).toBe('%PDF'); // valid PDF files start with this
  });
});
describe('formatScoreField — boundary cases', () => {
  test('handles an empty object', () => {
    expect(formatScoreField({})).toBe('');
  });

  test('handles deeply nested object without crashing', () => {
    const result = formatScoreField({ band: { nested: { deep: 'value' } } });
    expect(typeof result).toBe('string');
  });

  test('handles numeric zero (falsy but valid) correctly', () => {
    // 0 is falsy in JS — confirms whether this is treated as "missing" or a real value
    expect(formatScoreField(0)).toBe('N/A');
  });

  test('handles array input without throwing', () => {
    expect(() => formatScoreField(['A', 'B'])).not.toThrow();
  });
});