import { render, screen, waitFor } from '@testing-library/react';
import ProfileSummaryCard from '../components/ProfileSummaryCard';

beforeEach(() => { global.fetch = jest.fn(); });

test('shows loading then displays summary on success', async () => {
  global.fetch.mockResolvedValue({
    ok: true,
    json: async () => ({ summary: 'Doing great!', band: 'A', semester: '2022 Sem 1' }),
  });
  render(<ProfileSummaryCard studentId={1} studentName="Alice" />);
  expect(screen.getByText(/Loading summary/i)).toBeInTheDocument();
  await waitFor(() => expect(screen.getByText('Doing great!')).toBeInTheDocument());
});

test('shows "no data" message on 404', async () => {
  global.fetch.mockResolvedValue({ status: 404, ok: false });
  render(<ProfileSummaryCard studentId={1} studentName="Alice" />);
  await waitFor(() => expect(screen.getByText(/No assessment data yet/i)).toBeInTheDocument());
});