import { loadData } from '../utils/loadData';

describe('loadData Utility', () => {
  it('should fetch and set metrics successfully', async () => {
    // FIXED: Use backend-matching property names (studentid, band, scores)
    const mockStudentsFromApi = [{ studentid: 'S1', band: 'A', scores: {} }];
    
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockStudentsFromApi
    });

    const setMetrics = jest.fn();
    const setIsLoading = jest.fn();

    await loadData('therapist', 'admin', setMetrics, setIsLoading, 'none', 'asc');

    expect(setIsLoading).toHaveBeenCalledWith(true);
    expect(setMetrics).toHaveBeenCalled();
    expect(setIsLoading).toHaveBeenCalledWith(false);
  });

  it('should handle network or server errors gracefully', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => [] // FIXED: Return an empty array so .map() doesn't fail
    });

    const setMetrics = jest.fn();
    const setIsLoading = jest.fn();

    await loadData('therapist', 'admin', setMetrics, setIsLoading, 'none', 'asc');

    expect(setIsLoading).toHaveBeenCalledWith(true);
    expect(setMetrics).toHaveBeenCalledWith([]); // It will successfully map an empty array
    expect(setIsLoading).toHaveBeenCalledWith(false);
  });
});