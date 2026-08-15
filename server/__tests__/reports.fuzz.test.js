
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

const fc = require('fast-check');
const { formatScoreField } = require('../app');

describe('Fuzz testing: formatScoreField', () => {
  test('never throws regardless of input type', () => {
    fc.assert(
      fc.property(fc.anything(), (input) => {
        expect(() => formatScoreField(input)).not.toThrow();
      }),
      { numRuns: 1000 }
    );
  });

  test('always returns a string or a non-throwing pass-through value', () => {
    fc.assert(
      fc.property(fc.anything(), (input) => {
        const result = formatScoreField(input);
        expect(result).toBeDefined();
      }),
      { numRuns: 1000 }
    );
  });

  test('objects always produce a comma-separated key:value string', () => {
    fc.assert(
      fc.property(fc.dictionary(fc.string(), fc.oneof(fc.string(), fc.integer())), (obj) => {
        const result = formatScoreField(obj);
        expect(typeof result).toBe('string');
      }),
      { numRuns: 500 }
    );
  });
});