import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MOCK_FRAMER_MOTION } from '../../tests/mocks';
import { ToastProvider, useToast } from '../ui/Toast';

// Mock framer-motion
jest.mock('framer-motion', () => MOCK_FRAMER_MOTION);

// Simple test component to test the toast hook
const TestComponent = () => {
  const { addToast, toasts } = useToast();
  
  return (
    <div>
      <button onClick={() => addToast('Test message', 'success')}>
        Add Toast
      </button>
      <div data-testid="toast-count">{toasts.length}</div>
    </div>
  );
};

describe('Toast System', () => {
  it('should render ToastProvider without error', () => {
    expect(() => {
      render(
        <ToastProvider>
          <div>Test content</div>
        </ToastProvider>
      );
    }).not.toThrow();
  });

  it('should provide toast context to children', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    expect(screen.getByText('Add Toast')).toBeInTheDocument();
    expect(screen.getByTestId('toast-count')).toHaveTextContent('0');
  });
});