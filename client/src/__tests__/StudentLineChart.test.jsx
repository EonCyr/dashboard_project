import { render, screen, within, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { StudentLineChart } from '../components/LineChart';

jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  LineChart: ({ data, children }) => (
    <div data-testid="line-chart" data-point-count={data ? data.length : 0}>
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
  { semester: '2020 Sem 1', score: 16 },
  { semester: '2020 Sem 2', score: 30 },
  { semester: '2021 Sem 1', score: 32 },
  { semester: '2021 Sem 2', score: 20 },
  { semester: '2022 Sem 1', score: 27 },
  { semester: '2022 Sem 2', score: 18 },
];

describe('StudentLineChart', () => {
  test('renders the chart container', () => {
    render(<StudentLineChart historyData={mockHistoryData} />);
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  test('passes all historyData points (6) through to the chart', () => {
    render(<StudentLineChart historyData={mockHistoryData} />);
    expect(screen.getByTestId('line-chart')).toHaveAttribute('data-point-count', '6');
  });

  test('renders a CartesianGrid', () => {
    render(<StudentLineChart historyData={mockHistoryData} />);
    expect(screen.getByTestId('cartesian-grid')).toBeInTheDocument();
  });

  test('renders exactly one Line, plotting "score" and labeled "Weighted Score"', () => {
    render(<StudentLineChart historyData={mockHistoryData} />);
    const line = screen.getByTestId('line');
    expect(line).toHaveAttribute('data-key', 'score');
    expect(line).toHaveAttribute('data-name', 'Weighted Score');
  });

  test('renders the XAxis keyed on "semester"', () => {
    render(<StudentLineChart historyData={mockHistoryData} />);
    expect(screen.getByTestId('x-axis')).toHaveAttribute('data-key', 'semester');
  });

  test('renders the YAxis with the "Score" label', () => {
    render(<StudentLineChart historyData={mockHistoryData} />);
    expect(screen.getByTestId('y-axis')).toHaveAttribute('data-label', 'Score');
  });

  test('renders a Legend and Tooltip', () => {
    render(<StudentLineChart historyData={mockHistoryData} />);
    expect(screen.getByTestId('legend')).toBeInTheDocument();
    expect(screen.getByTestId('tooltip')).toBeInTheDocument();
  });

  test('does not crash when historyData is an empty array', () => {
    render(<StudentLineChart historyData={[]} />);
    expect(screen.getByTestId('line-chart')).toHaveAttribute('data-point-count', '0');
  });

  test('does not crash when historyData is undefined', () => {
    render(<StudentLineChart />);
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  test('re-renders with new data when historyData changes (e.g. fetch returns different student)', () => {
    const { rerender } = render(<StudentLineChart historyData={mockHistoryData} />);
    expect(screen.getByTestId('line-chart')).toHaveAttribute('data-point-count', '6');

    const newData = [{ semester: '2023 Sem 1', score: 40 }];
    rerender(<StudentLineChart historyData={newData} />);
    expect(screen.getByTestId('line-chart')).toHaveAttribute('data-point-count', '1');
  });
});