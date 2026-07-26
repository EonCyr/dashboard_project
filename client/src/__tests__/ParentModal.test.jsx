import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { ParentModal } from '../components/ParentModal.jsx';

// Mock the score calculator utility using Jest syntax
jest.mock('../utils/scoreCalculator.jsx', () => ({
  calculateStudentScores: (scores, band) => ({
    band: band || 'C7',
    totalScore: 58,
    scores: {
      vocab: { total: 15 },
      pap: { total: 20 },
      writing: { total: 10 },
      lrc: { total: 13 }
    }
  })
}));

describe('ParentModal Component', () => {
  const mockMetrics = [
    {
      id: 10,
      semester: '2026 Sem 1',
      value: 'C7',
      scores: { vocab: { total: 0 }, pap: { total: 43 }, writing: { total: 15 }, lrc: { total: 0 } }
    }
  ];

  const mockHistoryApiResponse = [
    {
      semester: '2025 Sem 2',
      band: 'B4',
      scores: { vocab: { total: 12 }, pap: { total: 18 }, writing: { total: 8 }, lrc: { total: 10 } }
    },
    {
      semester: '2026 Sem 1',
      band: 'C7',
      scores: { vocab: { total: 15 }, pap: { total: 20 }, writing: { total: 10 }, lrc: { total: 13 } }
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders student ID and fetches historical semester data successfully', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockHistoryApiResponse,
    });

    await act(async () => {
      render(<ParentModal metrics={mockMetrics} username="parent10" />);
    });

    expect(screen.getByText('Student ID: 10')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '2025 Sem 2' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '2026 Sem 1' })).toBeInTheDocument();
    });
  });

  it('switches active semester data when a different semester tab is clicked', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockHistoryApiResponse,
    });

    await act(async () => {
      render(<ParentModal metrics={mockMetrics} username="parent10" />);
    });

    const tab2025 = await screen.findByRole('button', { name: '2025 Sem 2' });
    
    await act(async () => {
      fireEvent.click(tab2025);
    });

    expect(tab2025).toHaveClass('active');
  });

  it('falls back to props metrics if the API call fails', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('API Failure'));

    await act(async () => {
      render(<ParentModal metrics={mockMetrics} username="parent10" />);
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '2026 Sem 1' })).toBeInTheDocument();
    });

    expect(screen.getByText('Student ID: 10')).toBeInTheDocument();
  });
});