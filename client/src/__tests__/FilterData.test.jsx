import { loadData, sortStudentMetrics } from '../utils/loadData';

describe('loadData sorting behavior', () => {
  test('keeps the original fetch order when sortBy is none', () => {
    const metrics = [
      { id: 2, value: 'B', semester: 'Sem 2', scores: { vocab: { total: 12 }, pap: { total: 8 }, writing: { total: 7 }, lrc: { total: 5 } } },
      { id: 1, value: 'A', semester: 'Sem 1', scores: { vocab: { total: 9 }, pap: { total: 6 }, writing: { total: 4 }, lrc: { total: 3 } } },
      { id: 3, value: 'C', semester: 'Sem 3', scores: { vocab: { total: 15 }, pap: { total: 10 }, writing: { total: 8 }, lrc: { total: 6 } } },
    ];

    expect(sortStudentMetrics(metrics, 'none', 'asc')).toEqual(metrics);
  });

  test('sorts students by overall band in descending order', () => {
    const metrics = [
      { id: 2, value: 'B', scores: { vocab: { total: 12 }, pap: { total: 8 }, writing: { total: 7 }, lrc: { total: 5 } } },
      { id: 1, value: 'A', scores: { vocab: { total: 9 }, pap: { total: 6 }, writing: { total: 4 }, lrc: { total: 3 } } },
      { id: 3, value: 'C', scores: { vocab: { total: 15 }, pap: { total: 10 }, writing: { total: 8 }, lrc: { total: 6 } } },
    ];

    const sorted = sortStudentMetrics(metrics, 'band', 'desc');
    expect(sorted.map((student) => student.id)).toEqual([3, 2, 1]);
  });
});
