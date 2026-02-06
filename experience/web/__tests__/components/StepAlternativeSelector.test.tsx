import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { StepAlternativeSelector } from '../../components/StepAlternativeSelector';
import { therapeuticService } from '../../services/therapeuticService';

// Mock store
const mockUpdateWaypoint = jest.fn();
jest.mock('../../stores/usePathExplorerStore', () => ({
  usePathExplorerStore: jest.fn(() => ({
    updateWaypoint: mockUpdateWaypoint
  }))
}));

// Mock service
jest.mock('../../services/therapeuticService', () => ({
  therapeuticService: {
    getStepAlternatives: jest.fn()
  }
}));

// We must reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});

describe('StepAlternativeSelector', () => {
  const defaultProps = {
    currentEmotionId: 'e1',
    goalEmotionId: 'e2',
    currentStepIndex: 1,
    onClose: jest.fn()
  };

  it('shows loading state initially', async () => {
    (therapeuticService.getStepAlternatives as jest.Mock).mockReturnValue(new Promise(() => {}));

    render(<StepAlternativeSelector {...defaultProps} />);
    expect(screen.getByText('Finding valid paths...')).toBeInTheDocument();
  });

  it('renders alternatives after loading', async () => {
    (therapeuticService.getStepAlternatives as jest.Mock).mockResolvedValue({
      alternatives: [
        { id: 'a1', name: 'Curiosity', category: 'Openness', vac: [0.1, 0.2, 0.3], description: 'Being curious.' },
        { id: 'a2', name: 'Hope', category: 'Positivity', vac: [0.2, 0.3, 0.4], description: 'Being hopeful.' }
      ]
    });

    render(<StepAlternativeSelector {...defaultProps} />);

    await waitFor(() => {
      expect(screen.queryByText('Finding valid paths...')).toBeNull();
    });

    expect(screen.getByText('Curiosity')).toBeInTheDocument();
    expect(screen.getByText('Hope')).toBeInTheDocument();
  });

  it('handles API errors gracefully', async () => {
    (therapeuticService.getStepAlternatives as jest.Mock).mockRejectedValue(new Error('Network error'));

    render(<StepAlternativeSelector {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Could not load alternatives')).toBeInTheDocument();
    });
  });

  it('calls updateWaypoint and onClose when alternative is selected', async () => {
     (therapeuticService.getStepAlternatives as jest.Mock).mockResolvedValue({
      alternatives: [
        { id: 'a1', name: 'Curiosity', category: 'Openness', vac: [0.1, 0.2, 0.3], description: 'Being curious.' }
      ]
    });

    render(<StepAlternativeSelector {...defaultProps} />);

    await waitFor(() => screen.getByText('Curiosity'));

    fireEvent.click(screen.getByText('Curiosity'));

    expect(mockUpdateWaypoint).toHaveBeenCalledWith(1, expect.objectContaining({
       emotion: 'Curiosity',
       category: 'Openness',
       vac: [0.1, 0.2, 0.3]
    }));

    expect(defaultProps.onClose).toHaveBeenCalled();
  });
});
