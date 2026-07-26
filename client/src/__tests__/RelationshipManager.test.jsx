import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { RelationshipManagerModal } from '../components/RelationshipManager';

// Helper: build a fetch mock that resolves once with the given status/body,
// so each test can queue up exactly the responses it expects, in order.
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

const noop = () => {};
const setIsLoading = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
});

test('renders nothing when isOpen is false', () => {
  render(
    <RelationshipManagerModal
      isOpen={false}
      onClose={noop}
      username="therapist1"
      isLoading={false}
      setIsLoading={setIsLoading}
    />
  );

  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test('loads and displays relationships when opened', async () => {
  mockFetchSequence([
    {
      ok: true,
      body: [{ studentid: 10, parentid: 20, relationship: 'Mother' }],
    },
  ]);

  render(
    <RelationshipManagerModal
      isOpen={true}
      onClose={noop}
      username="therapist1"
      isLoading={false}
      setIsLoading={setIsLoading}
    />
  );

  expect(global.fetch).toHaveBeenCalledWith(
    expect.stringContaining('/api/relationships?username=therapist1')
  );

  expect(await screen.findByText(/Student 10.*Parent 20.*Mother/)).toBeInTheDocument();
});

test('shows error when student or parent id is missing', async () => {
  mockFetchSequence([{ ok: true, body: [] }]); // initial load on open

  render(
    <RelationshipManagerModal
      isOpen={true}
      onClose={noop}
      username="therapist1"
      isLoading={false}
      setIsLoading={setIsLoading}
    />
  );

  await screen.findByText('No relationships loaded yet.');

  fireEvent.click(screen.getByText('Add Link'));

  expect(
    await screen.findByText('Please enter both a student ID and a parent ID.')
  ).toBeInTheDocument();
});

test('shows error when no relationship is selected', async () => {
  mockFetchSequence([{ ok: true, body: [] }]);

  render(
    <RelationshipManagerModal
      isOpen={true}
      onClose={noop}
      username="therapist1"
      isLoading={false}
      setIsLoading={setIsLoading}
    />
  );

  await screen.findByText('No relationships loaded yet.');

  fireEvent.change(screen.getByPlaceholderText('Student ID'), { target: { value: '10' } });
  fireEvent.change(screen.getByPlaceholderText('Parent ID'), { target: { value: '20' } });
  fireEvent.click(screen.getByText('Add Link'));

  expect(await screen.findByText('Please select a relationship.')).toBeInTheDocument();
});

test('shows success message after a valid add', async () => {
  mockFetchSequence([
    { ok: true, body: [] },                                       // initial load
    { ok: true, body: { message: 'Relationship added successfully' } }, // POST
    { ok: true, body: [{ studentid: 10, parentid: 20, relationship: 'Mother' }] }, // reload after add
  ]);

  render(
    <RelationshipManagerModal
      isOpen={true}
      onClose={noop}
      username="therapist1"
      isLoading={false}
      setIsLoading={setIsLoading}
    />
  );

  await screen.findByText('No relationships loaded yet.');

  fireEvent.change(screen.getByPlaceholderText('Student ID'), { target: { value: '10' } });
  fireEvent.change(screen.getByPlaceholderText('Parent ID'), { target: { value: '20' } });
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Mother' } });
  fireEvent.click(screen.getByText('Add Link'));

  await screen.findByText('Relationship added successfully');
});

test('shows error when the student is not related to this therapist', async () => {
  mockFetchSequence([
    { ok: true, body: [] }, // initial load
    { ok: false, body: { error: 'This student is not associated with your account.', code: 'STUDENT_NOT_RELATED' }, },
  ]);

  render(
    <RelationshipManagerModal
      isOpen={true}
      onClose={noop}
      username="therapist1"
      isLoading={false}
      setIsLoading={setIsLoading}
    />
  );

  await screen.findByText('No relationships loaded yet.');

  fireEvent.change(screen.getByPlaceholderText('Student ID'), { target: { value: '99' } });
  fireEvent.change(screen.getByPlaceholderText('Parent ID'), { target: { value: '20' } });
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Mother' } });
  fireEvent.click(screen.getByText('Add Link'));

  expect(
    await screen.findByText('This student is not associated with your account.') ).toBeInTheDocument();
});

test('shows error when the parent ID does not exist', async () => {
  mockFetchSequence([
    { ok: true, body: [] }, // initial load
    {
      ok: false,
      body: { error: 'No parent account exists with that ID.', code: 'PARENT_NOT_FOUND' },
    },
  ]);

  render(
    <RelationshipManagerModal
      isOpen={true}
      onClose={noop}
      username="therapist1"
      isLoading={false}
      setIsLoading={setIsLoading}
    />
  );

  await screen.findByText('No relationships loaded yet.');

  fireEvent.change(screen.getByPlaceholderText('Student ID'), { target: { value: '10' } });
  fireEvent.change(screen.getByPlaceholderText('Parent ID'), { target: { value: '999' } });
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Mother' } });
  fireEvent.click(screen.getByText('Add Link'));

  expect(
    await screen.findByText('No parent account exists with that ID.')
  ).toBeInTheDocument();
});

test('clears the input fields when the close button is clicked', async () => {
  mockFetchSequence([{ ok: true, body: [] }]);
  const onClose = jest.fn();

  render(
    <RelationshipManagerModal
      isOpen={true}
      onClose={onClose}
      username="therapist1"
      isLoading={false}
      setIsLoading={setIsLoading}
    />
  );

  await screen.findByText('No relationships loaded yet.');

  const studentInput = screen.getByPlaceholderText('Student ID');
  const parentInput = screen.getByPlaceholderText('Parent ID');

  fireEvent.change(studentInput, { target: { value: '10' } });
  fireEvent.change(parentInput, { target: { value: '20' } });
  fireEvent.click(screen.getByText('Close'));

  await waitFor(() => {
    expect(studentInput).toHaveValue(null);
    expect(parentInput).toHaveValue(null);
  });
  expect(onClose).toHaveBeenCalled();
});
