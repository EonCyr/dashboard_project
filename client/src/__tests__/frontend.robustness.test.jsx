import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import RiskConfigModal from '../RiskConfigModal';
import CommunicationThread from '../components/Communications';
import { ParentModal } from '../components/ParentModal';
import AddAssessmentModal from '../components/AddAssessmentModal';
import ClinicalReportDownload from '../components/ClinicalReportDownload';
import RelationshipManagerModal from '../components/RelationshipManager';

// Global Fetch Mock Utility
beforeEach(() => {
  global.fetch = jest.fn();
});

afterEach(() => {
  jest.resetAllMocks();
});

describe('Frontend Component Robustness Suite', () => {

  /* -------------------------------------------------------------------------- */
  /*  1. RiskConfigModal Robustness                                            */
  /* -------------------------------------------------------------------------- */
  describe('RiskConfigModal Edge Cases', () => {
    it('gracefully handles network failures during initial GET fetch without crashing', async () => {
      // Mock fetch rejection
      global.fetch.mockRejectedValueOnce(new Error('Network Offline'));

      render(
        <RiskConfigModal
          isOpen={true}
          onClose={jest.fn()}
          username="testuser"
        />
      );

      // Should render defaults and show fallback info message
      await waitFor(() => {
        expect(screen.getByText(/Loaded default threshold settings/i)).toBeInTheDocument();
      });
    });

    it('blocks submission and displays inline error if user inputs invalid threshold logic', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ A: { critical_score: 10, moderate_score: 20, high_performer_score: 30 } })
      });

      render(
        <RiskConfigModal
          isOpen={true}
          onClose={jest.fn()}
          username="testuser"
        />
      );

      const criticalInput = await screen.findByLabelText(/Critical Risk Ceiling/i);
      const moderateInput = screen.getByLabelText(/Moderate \/ At-Risk Ceiling/i);
      const submitBtn = screen.getByText(/Save Band A/i);

      // User enters Critical (35) > Moderate (20)
      fireEvent.change(criticalInput, { target: { value: '35' } });
      fireEvent.change(moderateInput, { target: { value: '20' } });

      fireEvent.click(submitBtn);

      // Expect validation alert on screen
      expect(await screen.findByText(/Validation Error/i)).toBeInTheDocument();
    });

    it('safely handles component unmounting while fetch is still pending (No Memory Leaks)', () => {
      // Return a fetch promise that never resolves immediately
      global.fetch.mockImplementationOnce(() => new Promise(() => {}));

      const { unmount } = render(
        <RiskConfigModal
          isOpen={true}
          onClose={jest.fn()}
          username="testuser"
        />
      );

      // Immediately unmount before fetch resolves
      expect(() => unmount()).not.toThrow();
    });
  });

  /* -------------------------------------------------------------------------- */
  /*  2. CommunicationThread Robustness                                         */
  /* -------------------------------------------------------------------------- */
  describe('CommunicationThread Edge Cases', () => {
    it('renders empty conversation box cleanly when server returns an empty list []', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      render(
        <CommunicationThread
          studentId="S1"
          parentId="P1"
          studentName="Alex"
          role="therapist"
          username="therapist1"
          embedded={true}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/No messages yet/i)).toBeInTheDocument();
      });
    });

    it('displays error message if message posting fails on backend', async () => {
      // Mock initial thread load
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      render(
        <CommunicationThread
          studentId="S1"
          parentId="P1"
          studentName="Alex"
          role="therapist"
          username="therapist1"
          embedded={true}
        />
      );

      // Mock failed POST request
      global.fetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Database Write Error' }),
      });

      const textarea = screen.getByPlaceholderText(/Add a professional recommendation/i);
      const submitBtn = screen.getByText(/Submit Recommendation/i);

      fireEvent.change(textarea, { target: { value: 'Test note' } });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText('Database Write Error')).toBeInTheDocument();
      });
    });
  });

  /* -------------------------------------------------------------------------- */
  /*  3. ParentModal Robustness                                                */
  /* -------------------------------------------------------------------------- */
  describe('ParentModal Edge Cases', () => {
    it('renders fallback student data if history endpoint fails (500)', async () => {
      const mockMetrics = [
        { id: 'S100', value: 'Band B', semester: '2026-S1', scores: { vocab: { total: 15 } } }
      ];

      global.fetch.mockRejectedValueOnce(new Error('500 Internal Server Error'));

      render(<ParentModal metrics={mockMetrics} username="parent1" />);

      // Should fall back to metrics[0] data without crashing
      await waitFor(() => {
        expect(screen.getByText(/Student ID: S100/i)).toBeInTheDocument();
      });
    });

    it('returns null gracefully when metrics prop is empty or undefined', () => {
      const { container } = render(<ParentModal metrics={[]} username="parent1" />);
      expect(container.firstChild).toBeNull();
    });
  });
 /* -------------------------------------------------------------------------- */
  /*  4. AddAssessmentModal Edge Cases                                         */
  /* -------------------------------------------------------------------------- */
  describe('AddAssessmentModal Edge Cases', () => {
    it('prevents form submission when required assessment fields are missing', () => {
      const handleClose = jest.fn();
      render(
        <AddAssessmentModal
          isOpen={true}
          onClose={handleClose}
          onSuccess={jest.fn()}
        />
      );

      const submitBtn = screen.getByText(/Save Assessment Components/i);
      fireEvent.click(submitBtn);

      expect(handleClose).not.toHaveBeenCalled();
    });

    it('displays error message when single assessment creation API fails (500)', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Failed to save individual assessment.' }),
      });

      render(
        <AddAssessmentModal
          isOpen={true}
          onClose={jest.fn()}
          onSuccess={jest.fn()}
        />
      );

      const studentInput = screen.getByLabelText(/Student ID/i);
      const semesterInput = screen.getByPlaceholderText(/2026 Sem 1/i);
      const submitBtn = screen.getByText(/Save Assessment Components/i);

      fireEvent.change(studentInput, { target: { value: 'STU999' } });
      fireEvent.change(semesterInput, { target: { value: '2026 Sem 1' } });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText(/Failed to save individual assessment/i)).toBeInTheDocument();
      });
    });
  });

  /* -------------------------------------------------------------------------- */
  /*  5. ClinicalReportDownload Edge Cases                                     */
  /* -------------------------------------------------------------------------- */
  describe('ClinicalReportDownload Edge Cases', () => {
    it('handles report compilation timeout or backend rejection gracefully', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Report generation timed out. Please try again.' }),
      });

      render(<ClinicalReportDownload studentId="STU001" semester="2026 Sem 1" />);

      // Fill in semester input to bypass initial empty input check
      const semesterInput = screen.getByPlaceholderText(/2022 Sem 1/i);
      fireEvent.change(semesterInput, { target: { value: '2026 Sem 1' } });

      const downloadBtn = screen.getByRole('button', { name: /Download Report/i });
      fireEvent.click(downloadBtn);

      await waitFor(() => {
        expect(screen.getByText(/Download failed. Please try again/i)).toBeInTheDocument();
      });
    });

    it('recovers button state after a network error during export', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      global.fetch.mockRejectedValueOnce(new Error('Network Error'));

      render(<ClinicalReportDownload studentId="STU001" semester="2026 Sem 1" />);

      const semesterInput = screen.getByPlaceholderText(/2022 Sem 1/i);
      fireEvent.change(semesterInput, { target: { value: '2026 Sem 1' } });

      const downloadBtn = screen.getByRole('button', { name: /Download Report/i });
      fireEvent.click(downloadBtn);

      await waitFor(() => {
        expect(downloadBtn).not.toBeDisabled();
      });
    });
  });

  /* -------------------------------------------------------------------------- */
  /*  6. RelationshipManagerModal Edge Cases                                   */
  /* -------------------------------------------------------------------------- */
  describe('RelationshipManagerModal Edge Cases', () => {
    it('renders error notice if fetching student-parent relationships fails', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      global.fetch.mockRejectedValueOnce(new Error('Failed to load relationships'));

      render(
        <RelationshipManagerModal
          isOpen={true}
          onClose={jest.fn()}
          username="therapist1"
          isLoading={false}
          setIsLoading={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Failed to load relationships/i)).toBeInTheDocument();
      });
      consoleSpy.mockRestore();
    });

    it('handles unexpected empty list [] from relationships endpoint without crashing', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      render(
        <RelationshipManagerModal
          isOpen={true}
          onClose={jest.fn()}
          username="therapist1"
          isLoading={false}
          setIsLoading={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/No relationships loaded yet/i)).toBeInTheDocument();
      });
    });
  });
});