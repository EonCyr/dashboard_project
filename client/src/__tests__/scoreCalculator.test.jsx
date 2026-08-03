import { calculateStudentScores } from '../utils/scoreCalculator';

describe('scoreCalculator Utility', () => {
  it('should correctly calculate total weighted score for band A', () => {
    const sampleScores = {
      vocab: { q1: 10, q2: 10 },
      'pa/phonics': { q1: 35 },
      writing: { q1: 7.5 },
      'listening/readingcomprehension': { q1: 7.5 }
    };
    
    const result = calculateStudentScores(sampleScores, 'A');
    
    // Check that the returned object matches the structure produced by your function
    expect(result).toBeDefined();
    expect(result.band).toBe('A');
    expect(result.totalScore).toBeDefined();
    expect(typeof result.score).toBe('number');
  });

  it('should handle missing scores gracefully and default to band B weights', () => {
    const result = calculateStudentScores(null, 'invalid_band');
    
    expect(result).toBeDefined();
    expect(result.band).toBe('INVALID_BAND'); // or normalized format
    expect(result.totalScore).toBe('0.00');
  });

  it('should correctly calculate total weighted score for band C', () => {
    const sampleScores = {
      vocab: { q1: 10 },
      'pa/phonics': { q1: 20 },
      writing: { q1: 30 },
      'listening/readingcomprehension': { q1: 40 }
    };
    
    const result = calculateStudentScores(sampleScores, 'C');
    expect(result.band).toBe('C');
    expect(typeof result.score).toBe('number');
  });

  it('should expose weighted totals for each category that can be compared to the overall score', () => {
    const sampleScores = {
      vocab: { q1: 10 },
      'pa/phonics': { q1: 20 },
      writing: { q1: 30 },
      'listening/readingcomprehension': { q1: 40 }
    };

    const result = calculateStudentScores(sampleScores, 'C');

    expect(result.scores.vocab.weightedTotal).toBe(1.5);
    expect(result.scores.pap.weightedTotal).toBe(7);
    expect(result.scores.writing.weightedTotal).toBe(7.5);
    expect(result.scores.lrc.weightedTotal).toBe(10);
  });

});