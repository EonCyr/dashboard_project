
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ReportDownload from '../components/ReportDownload';

beforeEach(() => {
  global.fetch = jest.fn();
});

test('shows an error if download is clicked with no semester entered', () => {
  render(<ReportDownload studentId={1} username="parent1" />);
  fireEvent.click(screen.getByText('Download Report'));
  expect(screen.getByText(/Please enter a semester/i)).toBeInTheDocument();
});

test('shows "no data" message on 404 response', async () => {
  global.fetch.mockResolvedValue({ status: 404 });

  render(<ReportDownload studentId={1} username="parent1" />);
  fireEvent.change(screen.getByPlaceholderText('2022 Sem 1'), { target: { value: '2022 Sem 1' } });
  fireEvent.click(screen.getByText('Download Report'));

  await waitFor(() => {
    expect(screen.getByText(/No assessment data available/i)).toBeInTheDocument();
  });
});