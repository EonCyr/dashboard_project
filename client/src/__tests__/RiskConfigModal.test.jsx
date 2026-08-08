import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RiskConfigModal from '../RiskConfigModal';

// Mock global fetch API
global.fetch = jest.fn();

describe('RiskConfigModal Component', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    username: 'therapist1',
    onSaveSuccess: jest.fn(),
  };

  beforeEach(() => {
    fetch.mockReset();
  });

  test('renders modal when isOpen is true', () => {
    fetch.mockResolvedValueOnce({
      json: async () => ({
        A: { critical_score: 22, moderate_score: 26, high_performer_score: 29, baseline_window: 2 }
      }),
    });

    render(<RiskConfigModal {...defaultProps} />);
    expect(screen.getByText(/Configure Risk Assessment Metrics/i)).toBeInTheDocument();
  });

  test('displays validation error if Critical >= Moderate threshold', async () => {
    fetch.mockResolvedValueOnce({
      json: async () => ({})
    });

    render(<RiskConfigModal {...defaultProps} />);

    // Get input fields
    const criticalInput = screen.getByLabelText(/Critical Risk Ceiling/i);
    const moderateInput = screen.getByLabelText(/Moderate \/ At-Risk Ceiling/i);
    const saveButton = screen.getByText(/Save Band A/i);

    // Set Critical higher than Moderate (25 >= 20)
    fireEvent.change(criticalInput, { target: { value: '25' } });
    fireEvent.change(moderateInput, { target: { value: '20' } });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/Validation Error/i)).toBeInTheDocument();
    });
  });
});