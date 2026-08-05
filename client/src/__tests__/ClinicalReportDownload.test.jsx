import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ClinicalReportDownload, { ClinicalStudentSelector } from '../components/ClinicalReportDownload';

beforeEach(() => {
  global.fetch = jest.fn();
});

describe('ClinicalReportDownload', () => {
  test('shows an error if download is clicked with no semester entered', () => {
    render(<ClinicalReportDownload studentId={1} username="therapist1" />);
    fireEvent.click(screen.getByText('Download Report'));
    expect(screen.getByText(/Please enter a semester/i)).toBeInTheDocument();
  });

  test('shows "no data" message on 404 response', async () => {
    global.fetch.mockResolvedValue({ status: 404 });

    render(<ClinicalReportDownload studentId={1} username="therapist1" />);
    fireEvent.change(screen.getByPlaceholderText('2022 Sem 1'), { target: { value: '2022 Sem 1' } });
    fireEvent.click(screen.getByText('Download Report'));

    await waitFor(() => {
      expect(screen.getByText(/No assessment data available/i)).toBeInTheDocument();
    });
  });

  test('shows timeout message on 504 response with a retry button', async () => {
    global.fetch.mockResolvedValue({ status: 504 });

    render(<ClinicalReportDownload studentId={1} username="therapist1" />);
    fireEvent.change(screen.getByPlaceholderText('2022 Sem 1'), { target: { value: '2022 Sem 1' } });
    fireEvent.click(screen.getByText('Download Report'));

    await waitFor(() => {
      expect(screen.getByText(/taking too long/i)).toBeInTheDocument();
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });
  });
});

describe('ClinicalStudentSelector', () => {
  const mockMetrics = [
    { id: 1, name: 'Alice' },
    { id: 2, name: 'Bob' },
  ];

  test('renders a dropdown option for each student', () => {
    render(<ClinicalStudentSelector metrics={mockMetrics} username="therapist1" />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  test('defaults selected student to the first in the list', () => {
    render(<ClinicalStudentSelector metrics={mockMetrics} username="therapist1" />);
    const select = screen.getByRole('combobox', { name: /student/i });
    expect(select.value).toBe('1');
  });
});