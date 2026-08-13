import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import MessageParentsModal from '../components/MessageParentsModal.jsx';

function mockFetchSequence(responses) {
  let call = 0;
  global.fetch = jest.fn(() => {
    const res = responses[Math.min(call, responses.length - 1)];
    call += 1;
    return Promise.resolve({
      ok: res.ok,
      json: () => Promise.resolve(res.body),
    });
  });
}

const findChatHeading = (label) =>
  screen.findByText(
    (_, element) =>
      element?.className === 'thread-title-heading' &&
      element.textContent.replace(/\s+/g, ' ').trim() === `Chat with ${label}`
  );

beforeEach(() => {
  jest.clearAllMocks();
});

describe('MessageParentsModal — messaging one parent (UC5 main flow)', () => {
  test('opens an embedded CommunicationThread for the selected parent', async () => {
    mockFetchSequence([
      {
        ok: true,
        body: [
          { studentid: 101, student_name: 'Student 101', parentid: 201, parent_name: 'parent_201' },
        ],
      },
      { ok: true, body: [] }, // CommunicationThread's own initial GET on open
    ]);

    render(<MessageParentsModal username="therapist1" onClose={() => {}} />);

    const openThreadBtn = await screen.findByText('Open thread');
    fireEvent.click(openThreadBtn);

    expect(await findChatHeading('Parent 201')).toBeInTheDocument();
    expect(screen.getByText('← Back to Parent List')).toBeInTheDocument();
  });

  test('going back from a thread returns to the parent list', async () => {
    mockFetchSequence([
      {
        ok: true,
        body: [
          { studentid: 101, student_name: 'Student 101', parentid: 201, parent_name: 'parent_201' },
        ],
      },
      { ok: true, body: [] },
    ]);

    render(<MessageParentsModal username="therapist1" onClose={() => {}} />);

    fireEvent.click(await screen.findByText('Open thread'));
    await findChatHeading('Parent 201');

    fireEvent.click(screen.getByText('← Back to Parent List'));

    expect(await screen.findByText('Parent 201')).toBeInTheDocument();
    expect(screen.getByText('Message Parents')).toBeInTheDocument();
  });
});

describe('MessageParentsModal — parent list rendering', () => {
  test('rows are deduplicated by formatted parent name, and unlinked students show "No parent linked" with no Open thread button', async () => {
    mockFetchSequence([
      {
        ok: true,
        body: [
          { studentid: 101, student_name: 'Student 101', parentid: 201, parent_name: 'parent_201' },
          { studentid: 102, student_name: 'Student 102', parentid: null, parent_name: null },
          { studentid: 103, student_name: 'Student 103', parentid: 203, parent_name: 'parent_203' },
        ],
      },
    ]);

    render(<MessageParentsModal username="therapist1" onClose={() => {}} />);

    await screen.findByText('Parent 201');
    expect(screen.getByText('Parent 203')).toBeInTheDocument();
    expect(screen.getByText('No parent linked')).toBeInTheDocument();

    // Two "Open thread" buttons for the two linked parents, none for the unlinked one
    expect(screen.getAllByText('Open thread')).toHaveLength(2);
  });
});

describe('MessageParentsModal — broadcast to all parents (extension of UC5)', () => {
  test('toggling to "Message All Parents" hides the parent list and shows the broadcast form', async () => {
    mockFetchSequence([
      {
        ok: true,
        body: [{ studentid: 101, student_name: 'Student 101', parentid: 201, parent_name: 'parent_201' }],
      },
    ]);

    render(<MessageParentsModal username="therapist1" onClose={() => {}} />);

    await screen.findByText('Parent 201');
    fireEvent.click(screen.getByText('Message All Parents'));

    expect(screen.queryByText('Parent 201')).not.toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/Message to send to every linked parent/i)
    ).toBeInTheDocument();
  });

  test('sends one POST per linked parent and skips students with no linked parent', async () => {
    mockFetchSequence([
      {
        ok: true,
        body: [
          { studentid: 101, student_name: 'Student 101', parentid: 201, parent_name: 'parent_201' },
          { studentid: 102, student_name: 'Student 102', parentid: null, parent_name: null },
          { studentid: 103, student_name: 'Student 103', parentid: 203, parent_name: 'parent_203' },
        ],
      },
      { ok: true, body: { id: 20 } }, // POST for parent_201
      { ok: true, body: { id: 21 } }, // POST for parent_203
    ]);

    render(<MessageParentsModal username="therapist1" onClose={() => {}} />);

    await screen.findByText('Parent 201');
    fireEvent.click(screen.getByText('Message All Parents'));

    const textarea = screen.getByPlaceholderText(/Message to send to every linked parent/i);
    fireEvent.change(textarea, { target: { value: 'Reminder: parent-teacher meeting next week' } });
    fireEvent.click(screen.getByText('Send to All'));

    await waitFor(() => expect(screen.getByText('Sent to 2 of 3 parent(s).')).toBeInTheDocument());

    // 1 initial GET + 2 POSTs (the unlinked student is skipped — no parentid)
    expect(global.fetch).toHaveBeenCalledTimes(3);
    expect(textarea.value).toBe('');
  });

  test('counts a failed POST correctly in the success tally without stopping the broadcast', async () => {
    let call = 0;
    global.fetch = jest.fn(() => {
      call += 1;
      if (call === 1) {
        return Promise.resolve({
          ok: true,
          json: async () => [
            { studentid: 101, student_name: 'Student 101', parentid: 201, parent_name: 'parent_201' },
            { studentid: 103, student_name: 'Student 103', parentid: 203, parent_name: 'parent_203' },
          ],
        });
      }
      if (call === 2) {
        // First broadcast POST fails
        return Promise.resolve({ ok: false, json: async () => ({ error: 'Failed to save message' }) });
      }
      // Second broadcast POST succeeds
      return Promise.resolve({ ok: true, json: async () => ({ id: 22 }) });
    });

    render(<MessageParentsModal username="therapist1" onClose={() => {}} />);

    await screen.findByText('Parent 201');
    fireEvent.click(screen.getByText('Message All Parents'));

    const textarea = screen.getByPlaceholderText(/Message to send to every linked parent/i);
    fireEvent.change(textarea, { target: { value: 'Broadcast update' } });
    fireEvent.click(screen.getByText('Send to All'));

    await waitFor(() => expect(screen.getByText('Sent to 1 of 2 parent(s).')).toBeInTheDocument());
  });
});

describe('MessageParentsModal — close behaviour', () => {
  test('calls onClose when the × button is clicked', async () => {
    mockFetchSequence([{ ok: true, body: [] }]);
    const onClose = jest.fn();

    render(<MessageParentsModal username="therapist1" onClose={onClose} />);

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByText('×'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
