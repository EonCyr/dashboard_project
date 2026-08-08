import { getRiskStatus } from '../utils/risk.js'; 

describe('getRiskStatus Utility Function', () => {
  const mockConfig = {
    A: { criticalScore: 22, moderateScore: 26, highPerformerScore: 29, baselineWindow: 2 },
    B: { criticalScore: 20, moderateScore: 25, highPerformerScore: 28, baselineWindow: 2 },
  };

  test('should assign CRITICAL_RISK when totalScore is below critical ceiling', () => {
    const student = { value: 'A', totalScore: 15, assessmentsCount: 3 };
    const result = getRiskStatus(student, mockConfig);

    expect(result.statusTag).toBe('CRITICAL_RISK');
    expect(result.statusLabel).toBe('Critical Intervention Needed');
  });

  test('should assign MODERATE_RISK when totalScore is between critical and moderate ceilings', () => {
    const student = { value: 'A', totalScore: 24, assessmentsCount: 3 };
    const result = getRiskStatus(student, mockConfig);

    expect(result.statusTag).toBe('MODERATE_RISK');
    expect(result.statusLabel).toBe('At-Risk / Stagnant');
  });

  test('should assign HIGH_PERFORMER when totalScore meets or exceeds benchmark', () => {
    const student = { value: 'A', totalScore: 30, assessmentsCount: 3 };
    const result = getRiskStatus(student, mockConfig);

    expect(result.statusTag).toBe('HIGH_PERFORMER');
    expect(result.statusLabel).toBe('Exceeding Milestones');
  });

  test('should assign INSUFFICIENT_DATA when assessment history is below baseline window', () => {
    const student = { value: 'A', totalScore: 30, assessmentsCount: 1 };
    const result = getRiskStatus(student, mockConfig);

    expect(result.statusTag).toBe('INSUFFICIENT_DATA');
    expect(result.statusLabel).toBe('Needs Baseline Data');
  });

  test('should fallback gracefully to Band B defaults if band configuration is missing', () => {
    const student = { value: 'UnknownBand', totalScore: 18, assessmentsCount: 2 };
    const result = getRiskStatus(student, mockConfig);

    // Band B critical threshold is 20 -> score 18 should be CRITICAL_RISK
    expect(result.statusTag).toBe('CRITICAL_RISK');
  });
});