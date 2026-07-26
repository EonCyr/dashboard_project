import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { StudentModal } from '../components/StudentModal';
import '@testing-library/jest-dom';

const mockStudent = {
  id: 'S101',
  value: 'A',
  totalScore: '95.00',
  semester: 'Sem 1',
  scores: {
    vocab: { total: 20, items: [{ label: 'Synonyms', value: 10 }] },
    pap: { total: 30, items: [] },
    writing: { total: 25, items: [] },
    lrc: { total: 20, items: [] }
  }
};

const mockHistoryResponse = [
  {
    semester: 'Sem 1',
    band: 'A',
    scores: { vocab: { q1: 10 } }
  }
];

describe('StudentModal Component', () => {
  beforeEach(() => {
    // Mock the student history API call required by useEffect
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockHistoryResponse,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render student details when selected', async () => {
    render(<StudentModal selectedStudent={mockStudent} onClose={() => {}} />);

    // Wait for the asynchronous fetch and state update to finish rendering
    expect(await screen.findByText(/Student ID: S101 In-Depth Report/i)).toBeInTheDocument();
  });

  it('should call onClose when close button is clicked', async () => {
    const handleClose = jest.fn();
    render(<StudentModal selectedStudent={mockStudent} onClose={handleClose} />);
    
    // Wait for modal content to load before looking for the close button
    const closeBtn = await screen.findByRole('button', { name: /close/i });
    fireEvent.click(closeBtn);
    
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('should switch active semester data when clicking a semester tab', async () => {
    const multiSemesterHistory = [
      { semester: 'Sem 1', band: 'A', scores: { vocab: { q1: 10 } } },
      { semester: 'Sem 2', band: 'B', scores: { vocab: { q1: 15 } } }
    ];

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => multiSemesterHistory,
    });

    render(<StudentModal selectedStudent={mockStudent} onClose={() => {}} />);

    const sem2Tab = await screen.findByRole('button', { name: 'Sem 2' });
    fireEvent.click(sem2Tab);

    // FIXED: Use a custom text matcher function to ignore HTML tag boundaries
    expect(
      await screen.findByText((content, element) => {
        return element.tagName.toLowerCase() === 'strong' && content.trim() === 'B';
      })
    ).toBeInTheDocument();
  });
});