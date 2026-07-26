import { renderHook, act } from '@testing-library/react';
import { useAuth } from '../hooks/useAuth';

describe('useAuth Hook', () => {
  it('should initialize with default logged-out state', () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.isLoggedIn).toBe(false);
    expect(result.current.role).toBe('');
    expect(result.current.userId).toBeNull();
  });

  it('should handle successful login', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ role: 'therapist', userid: 123 })
    });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.handleLogin({ preventDefault: () => {} });
    });

    expect(result.current.isLoggedIn).toBe(true);
    expect(result.current.role).toBe('therapist');
    expect(result.current.userId).toBe(123);
  });

  it('should handle login failure and set error message', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Invalid credentials' })
    });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.handleLogin({ preventDefault: () => {} });
    });

    expect(result.current.isLoggedIn).toBe(false);
    expect(result.current.errorMessage).toBe('Invalid credentials');
  });
});