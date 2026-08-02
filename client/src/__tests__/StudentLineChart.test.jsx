import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { StudentLineChart } from '../components/linechart';

jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  LineChart: ({ data, children }) => (
    <div data-testid="line-chart" data-point-count={data ? data.length : 0} data-values={JSON.stringify(data)}>
      {children}
    </div>
  ),
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Line: ({ dataKey, name }) => (
    <div data-testid="line" data-key={dataKey} data-name={name} />
  ),
  XAxis: ({ dataKey }) => <div data-testid="x-axis" data-key={dataKey} />,
  YAxis: ({ label }) => <div data-testid="y-axis" data-label={label?.value} />,
  Legend: () => <div data-testid="legend" />,
  Tooltip: () => <div data-testid="tooltip" />,
}));

const mockHistoryData = [
  { semester: '2020 Sem 1', scores: { vocab: { total: 10 }, pap: { total: 8 }, writing: { total: 6 }, lrc: { total: 4 } } },
  { semester: '2020 Sem 2', scores: { vocab: { total: 12 }, pap: { total: 9 }, writing: { total: 7 }, lrc: { total: 5 } } },
];

describe('StudentLineChart', () => {
  test('renders a line for each visible category', () => {
    render(<StudentLineChart historyData={mockHistoryData} visibleCategories={{ overall: true, vocab: true, pap: true, writing: true, lrc: true }} />);
    const lines = screen.getAllByTestId('line');
    expect(lines).toHaveLength(5);
    expect(lines.map((line) => line.getAttribute('data-key'))).toEqual(['overall', 'vocab', 'pap', 'writing', 'lrc']);
  });

  test('hides lines for categories that are not visible', () => {
    render(<StudentLineChart historyData={mockHistoryData} visibleCategories={{ overall: true, vocab: true, pap: false, writing: false, lrc: false }} />);
    const lines = screen.getAllByTestId('line');
    expect(lines).toHaveLength(2);
    expect(lines[0]).toHaveAttribute('data-key', 'overall');
    expect(lines[1]).toHaveAttribute('data-key', 'vocab');
  });

  test('uses weighted category values for chart series', () => {
    const weightedHistory = [
      { semester: '2020 Sem 1', score: 12, scores: { vocab: { total: 10, weightedTotal: 2.5 }, pap: { total: 8, weightedTotal: 4 }, writing: { total: 6, weightedTotal: 1.2 }, lrc: { total: 4, weightedTotal: 0.8 } } },
    ];

    render(<StudentLineChart historyData={weightedHistory} visibleCategories={{ overall: false, vocab: true, pap: false, writing: false, lrc: false }} />);
    const chart = screen.getByTestId('line-chart');
    expect(chart).toHaveAttribute('data-values', '[{"semester":"2020 Sem 1","vocab":2.5}]');
  });
});