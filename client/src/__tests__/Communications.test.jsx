import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CommunicationThread from '../components/Communications.jsx';

beforeEach(() => {
  global.fetch = jest.fn();
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('CommunicationThread — loading and precondition guards', () => {
  test('does not fetch when studentId or parentId is missing', () => {
    render(
      <CommunicationThread
        studentId={null}
        parentId={2}
        studentName="Alice"
        role="parent"
        username="parent1"
        onClose={() => {}}
      />
    );
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('shows an empty state when no messages exist yet', async () => {
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => [] });

    render(
      <CommunicationThread
        studentId={1}
        parentId={2}
        studentName="Alice"
        role="parent"
        username="parent1"
        onClose={() => {}}
      />
    );

    await waitFor(() => expect(screen.getByText(/No messages yet/i)).toBeInTheDocument());
  });

  test('shows an error state when the initial fetch fails', async () => {
    global.fetch.mockResolvedValueOnce({ ok: false });

    render(
      <CommunicationThread
        studentId={1}
        parentId={2}
        studentName="Alice"
        role="parent"
        username="parent1"
        onClose={() => {}}
      />
    );

    await waitFor(() =>
      expect(screen.getByText(/Could not load messages/i)).toBeInTheDocument()
    );
  });
});

describe('UC4: Submit Home Observations (role = parent)', () => {
  test('main flow: parent submits an observation and it appears in the reloaded thread', async () => {
    global.fetch
      .mockResolvedValueOnce({ ok: true, json: async () => [] }) // initial load (step: DashboardView opens thread)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 10 }) }) // POST /communications, step 5 INSERT success
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            id: 10,
            sender_role: 'parent',
            sender_username: 'parent1',
            message: 'She read for 20 minutes tonight, seemed confident',
            created_at: '2026-08-05T10:00:00Z',
          },
        ],
      }); // reload after submit, step 8/9: confirmation reflected in thread

    render(
      <CommunicationThread
        studentId={1}
        parentId={2}
        studentName="Alice"
        role="parent"
        username="parent1"
        onClose={() => {}}
      />
    );

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

    const textarea = screen.getByPlaceholderText(/Share a home observation/i);
    fireEvent.change(textarea, {
      target: { value: 'She read for 20 minutes tonight, seemed confident' },
    });
    fireEvent.click(screen.getByText('Submit Observation'));

    await waitFor(() =>
      expect(
        screen.getByText('She read for 20 minutes tonight, seemed confident')
      ).toBeInTheDocument()
    );
    expect(textarea.value).toBe('');

    // Confirms the POST body matches the sequence diagram's createCommunication() payload
    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      '/api/communications',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          studentId: 1,
          parentId: 2,
          senderUsername: 'parent1',
          senderRole: 'parent',
          message: 'She read for 20 minutes tonight, seemed confident',
        }),
      })
    );
  });

  test('alt flow 5a: displays the validation error from the Controller layer without losing the drafted input', async () => {
    global.fetch
      .mockResolvedValueOnce({ ok: true, json: async () => [] })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Message must be between 1 and 2000 characters' }),
      });

    render(
      <CommunicationThread
        studentId={1}
        parentId={2}
        studentName="Alice"
        role="parent"
        username="parent1"
        onClose={() => {}}
      />
    );

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

    const textarea = screen.getByPlaceholderText(/Share a home observation/i);
    fireEvent.change(textarea, { target: { value: 'x' } });
    fireEvent.click(screen.getByText('Submit Observation'));

    await waitFor(() =>
      expect(screen.getByText(/Message must be between 1 and 2000 characters/i)).toBeInTheDocument()
    );
    // The drafted input is preserved, matching alt flow 5a's "without losing their current input"
    expect(textarea.value).toBe('x');
  });

  test('error state: system fails to save the observation (network/server failure)', async () => {
    global.fetch
      .mockResolvedValueOnce({ ok: true, json: async () => [] })
      .mockRejectedValueOnce(new Error('Network error'));

    render(
      <CommunicationThread
        studentId={1}
        parentId={2}
        studentName="Alice"
        role="parent"
        username="parent1"
        onClose={() => {}}
      />
    );

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

    const textarea = screen.getByPlaceholderText(/Share a home observation/i);
    fireEvent.change(textarea, { target: { value: 'Home practice notes' } });
    fireEvent.click(screen.getByText('Submit Observation'));

    await waitFor(() => expect(screen.getByText(/Network error/i)).toBeInTheDocument());
  });

  test('does not submit an empty or whitespace-only observation', async () => {
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => [] });

    render(
      <CommunicationThread
        studentId={1}
        parentId={2}
        studentName="Alice"
        role="parent"
        username="parent1"
        onClose={() => {}}
      />
    );

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

    const textarea = screen.getByPlaceholderText(/Share a home observation/i);
    fireEvent.change(textarea, { target: { value: '   ' } });
    fireEvent.click(screen.getByText('Submit Observation'));

    // No second fetch call — the guard clause in handleSubmit short-circuits
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});

describe('UC5: Provide Professional Recommendations (role = therapist)', () => {
  test('main flow: therapist submits a recommendation, labeled and routed as sender_role "therapist"', async () => {
    global.fetch
      .mockResolvedValueOnce({ ok: true, json: async () => [] })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 11 }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            id: 11,
            sender_role: 'therapist',
            sender_username: 'therapist1',
            message: 'Recommend daily phonics drills for the next two weeks',
            created_at: '2026-08-05T11:00:00Z',
          },
        ],
      });

    render(
      <CommunicationThread
        studentId={1}
        parentId={2}
        studentName="Alice"
        role="therapist"
        username="therapist1"
        onClose={() => {}}
      />
    );

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

    const textarea = screen.getByPlaceholderText(/Add a professional recommendation/i);
    fireEvent.change(textarea, {
      target: { value: 'Recommend daily phonics drills for the next two weeks' },
    });
    fireEvent.click(screen.getByText('Submit Recommendation'));

    await waitFor(() =>
      expect(
        screen.getByText('Recommend daily phonics drills for the next two weeks')
      ).toBeInTheDocument()
    );
    expect(screen.getByText(/Therapist/)).toBeInTheDocument();

    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      '/api/communications',
      expect.objectContaining({
        body: JSON.stringify({
          studentId: 1,
          parentId: 2,
          senderUsername: 'therapist1',
          senderRole: 'therapist',
          message: 'Recommend daily phonics drills for the next two weeks',
        }),
      })
    );
  });
});

describe('CommunicationThread — close behaviour', () => {
  test('calls onClose when the Close button is clicked', async () => {
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => [] });
    const onClose = jest.fn();

    render(
      <CommunicationThread
        studentId={1}
        parentId={2}
        studentName="Alice"
        role="parent"
        username="parent1"
        onClose={onClose}
      />
    );

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByText('Close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
