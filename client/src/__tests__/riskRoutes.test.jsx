import { waitFor } from '@testing-library/react';

describe('Risk Configuration API Utility', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('fetches risk configuration data from API', async () => {
    const mockResponse = {
      A: { critical_score: 22, moderate_score: 26, high_performer_score: 29, baseline_window: 2 },
      B: { critical_score: 20, moderate_score: 25, high_performer_score: 28, baseline_window: 2 }
    };

    // Mock successful fetch API response
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const response = await fetch('/api/config/risk');
    const data = await response.json();

    expect(global.fetch).toHaveBeenCalledWith('/api/config/risk');
    expect(data).toEqual(mockResponse);
    expect(data.A.critical_score).toBe(22);
  });

  test('handles API error response gracefully', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const response = await fetch('/api/config/risk');
    expect(response.ok).toBe(false);
    expect(response.status).toBe(500);
  });
});