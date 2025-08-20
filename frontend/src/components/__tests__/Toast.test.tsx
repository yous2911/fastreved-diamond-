import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderHook } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MOCK_FRAMER_MOTION } from '../../tests/mocks';
import { Toast, useToast } from '../ui/Toast';

// Mock framer-motion
jest.mock('framer-motion', () => MOCK_FRAMER_MOTION);

// Mock timers
jest.useFakeTimers();

// Mock Date.now to return predictable IDs
let mockDateNow = 1000000;

// Mock the entire Date object if needed
const originalDate = global.Date;

beforeAll(() => {
  global.Date = class extends originalDate {
    static now() {
      return mockDateNow++;
    }
  } as any;
});

afterAll(() => {
  global.Date = originalDate;
});

describe('Toast Component', () => {
  let user: ReturnType<typeof userEvent.setup>;
  const mockOnClose = jest.fn();

  beforeEach(() => {
    user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    jest.clearAllMocks();
    jest.clearAllTimers();
    mockDateNow = 1000000; // Reset counter
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  const DEFAULT_PROPS = {
    id: 'test-toast',
    type: 'info' as const,
    message: 'Test message',
    onClose: mockOnClose,
  };

  describe('Basic Rendering', () => {
    it('should render toast with message', () => {
      render(<Toast {...DEFAULT_PROPS} />);
      expect(screen.getByText('Test message')).toBeInTheDocument();
    });

    it('should render with correct type icon', () => {
      const TYPES = [
        { type: 'success' as const, icon: '✅' },
        { type: 'error' as const, icon: '❌' },
        { type: 'warning' as const, icon: '⚠️' },
        { type: 'info' as const, icon: 'ℹ️' },
      ];

      TYPES.forEach(({ type, icon }) => {
        const { unmount } = render(<Toast {...DEFAULT_PROPS} type={type} />);
        expect(screen.getByText(icon)).toBeInTheDocument();
        unmount();
      });
    });

    it('should render close button', () => {
      render(<Toast {...DEFAULT_PROPS} />);
      expect(screen.getByText('×')).toBeInTheDocument();
    });
  });

  describe('Toast Types and Styling', () => {
    it('should apply correct styling for success type', () => {
      render(<Toast {...DEFAULT_PROPS} type="success" />);
      const toastElement = screen.getByText('Test message').closest('div');
      expect(toastElement).toHaveClass('bg-green-500', 'border-green-600');
    });

    it('should apply correct styling for error type', () => {
      render(<Toast {...DEFAULT_PROPS} type="error" />);
      const toastElement = screen.getByText('Test message').closest('div');
      expect(toastElement).toHaveClass('bg-red-500', 'border-red-600');
    });

    it('should apply correct styling for warning type', () => {
      render(<Toast {...DEFAULT_PROPS} type="warning" />);
      const toastElement = screen.getByText('Test message').closest('div');
      expect(toastElement).toHaveClass('bg-yellow-500', 'border-yellow-600');
    });

    it('should apply correct styling for info type', () => {
      render(<Toast {...DEFAULT_PROPS} type="info" />);
      const toastElement = screen.getByText('Test message').closest('div');
      expect(toastElement).toHaveClass('bg-blue-500', 'border-blue-600');
    });
  });

  describe('Positioning', () => {
    const POSITIONS = [
      { position: 'top-right' as const, classes: 'top-4 right-4' },
      { position: 'top-left' as const, classes: 'top-4 left-4' },
      { position: 'bottom-right' as const, classes: 'bottom-4 right-4' },
      { position: 'bottom-left' as const, classes: 'bottom-4 left-4' },
    ];

    POSITIONS.forEach(({ position, classes }) => {
      it(`should position toast at ${position}`, () => {
        render(<Toast {...DEFAULT_PROPS} position={position} />);
        const toastContainer = document.querySelector('.fixed');
        expect(toastContainer).toHaveClass(...classes.split(' '));
      });
    });

    it('should default to top-right position', () => {
      render(<Toast {...DEFAULT_PROPS} />);
      const toastContainer = document.querySelector('.fixed');
      expect(toastContainer).toHaveClass('top-4', 'right-4');
    });
  });

  describe('Auto-dismiss Functionality', () => {
    it('should auto-dismiss after default duration', async () => {
      render(<Toast {...DEFAULT_PROPS} />);
      
      expect(mockOnClose).not.toHaveBeenCalled();
      
      act(() => {
        jest.advanceTimersByTime(5000);
      });
      
      expect(mockOnClose).toHaveBeenCalledWith('test-toast');
    });

    it('should auto-dismiss after custom duration', async () => {
      render(<Toast {...DEFAULT_PROPS} duration={3000} />);
      
      act(() => {
        jest.advanceTimersByTime(2999);
      });
      expect(mockOnClose).not.toHaveBeenCalled();
      
      act(() => {
        jest.advanceTimersByTime(1);
      });
      expect(mockOnClose).toHaveBeenCalledWith('test-toast');
    });

    it('should not auto-dismiss when duration is 0', async () => {
      render(<Toast {...DEFAULT_PROPS} duration={0} />);
      
      act(() => {
        jest.advanceTimersByTime(10000);
      });
      
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should not auto-dismiss when duration is negative', async () => {
      render(<Toast {...DEFAULT_PROPS} duration={-1} />);
      
      act(() => {
        jest.advanceTimersByTime(10000);
      });
      
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('Manual Close', () => {
    it('should close when close button is clicked', async () => {
      render(<Toast {...DEFAULT_PROPS} />);
      
      const closeButton = screen.getByText('×');
      await user.click(closeButton);
      
      expect(mockOnClose).toHaveBeenCalledWith('test-toast');
    });

    it('should call onClose with correct id', async () => {
      render(<Toast {...DEFAULT_PROPS} id="custom-id" />);
      
      const closeButton = screen.getByText('×');
      await user.click(closeButton);
      
      expect(mockOnClose).toHaveBeenCalledWith('custom-id');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(
        <Toast 
          {...DEFAULT_PROPS} 
          role="alert"
          aria-live="polite"
          aria-atomic="true"
        />
      );
      
      const toast = document.querySelector('[role="alert"]');
      expect(toast).toHaveAttribute('aria-live', 'polite');
      expect(toast).toHaveAttribute('aria-atomic', 'true');
    });

    it('should be focusable and keyboard accessible', async () => {
      render(<Toast {...DEFAULT_PROPS} />);
      
      const closeButton = screen.getByText('×');
      closeButton.focus();
      
      await user.keyboard('{Enter}');
      expect(mockOnClose).toHaveBeenCalledWith('test-toast');
    });
  });

  describe('Animation', () => {
    it('should have proper animation classes', () => {
      render(<Toast {...DEFAULT_PROPS} position="top-right" />);
      
      const toastContainer = document.querySelector('.fixed');
      expect(toastContainer).toBeInTheDocument();
    });

    it('should animate from correct direction based on position', () => {
      const { rerender } = render(<Toast {...DEFAULT_PROPS} position="top-left" />);
      let toastContainer = document.querySelector('.fixed');
      expect(toastContainer).toBeInTheDocument();
      
      rerender(<Toast {...DEFAULT_PROPS} position="bottom-right" />);
      toastContainer = document.querySelector('.fixed');
      expect(toastContainer).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle long messages', () => {
      const LONG_MESSAGE = 'This is a very long toast message that should still display properly and not break the layout or functionality of the toast component';
      render(<Toast {...DEFAULT_PROPS} message={LONG_MESSAGE} />);
      
      expect(screen.getByText(LONG_MESSAGE)).toBeInTheDocument();
    });

    it('should handle empty messages', () => {
      render(<Toast {...DEFAULT_PROPS} message="" />);
      
      const messageSpan = document.querySelector('.flex-1.font-medium');
      expect(messageSpan).toBeInTheDocument();
      expect(messageSpan).toHaveTextContent('');
      expect(screen.getByText('×')).toBeInTheDocument(); // Close button should still be there
    });

    it('should handle special characters in messages', () => {
      const SPECIAL_MESSAGE = 'Toast with émojis 🚀 and special chars: <>&"\'';
      render(<Toast {...DEFAULT_PROPS} message={SPECIAL_MESSAGE} />);
      
      expect(screen.getByText(SPECIAL_MESSAGE)).toBeInTheDocument();
    });
  });
});

describe('useToast Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('Basic Functionality', () => {
    it('should initialize with empty toasts array', () => {
      const { result } = renderHook(() => useToast());
      
      expect(result.current.toasts).toEqual([]);
    });

    it('should add toast with addToast', () => {
      const { result } = renderHook(() => useToast());
      
      act(() => {
        result.current.addToast({
          type: 'info',
          message: 'Test toast',
        });
      });
      
      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0]).toMatchObject({
        type: 'info',
        message: 'Test toast',
      });
      expect(result.current.toasts[0].id).toBeDefined();
    });

    it('should remove toast with removeToast', () => {
      const { result } = renderHook(() => useToast());
      
      let toastId: string;
      act(() => {
        toastId = result.current.addToast({
          type: 'info',
          message: 'Test toast',
        });
      });
      
      expect(result.current.toasts).toHaveLength(1);
      
      act(() => {
        result.current.removeToast(toastId);
      });
      
      expect(result.current.toasts).toHaveLength(0);
    });
  });

  describe('Convenience Methods', () => {
    it('should add success toast', () => {
      const { result } = renderHook(() => useToast());
      
      act(() => {
        result.current.success('Success message');
      });
      
      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0]).toMatchObject({
        type: 'success',
        message: 'Success message',
      });
    });

    it('should add error toast', () => {
      const { result } = renderHook(() => useToast());
      
      act(() => {
        result.current.error('Error message');
      });
      
      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0]).toMatchObject({
        type: 'error',
        message: 'Error message',
      });
    });

    it('should add warning toast', () => {
      const { result } = renderHook(() => useToast());
      
      act(() => {
        result.current.warning('Warning message');
      });
      
      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0]).toMatchObject({
        type: 'warning',
        message: 'Warning message',
      });
    });

    it('should add info toast', () => {
      const { result } = renderHook(() => useToast());
      
      act(() => {
        result.current.info('Info message');
      });
      
      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0]).toMatchObject({
        type: 'info',
        message: 'Info message',
      });
    });
  });

  describe('Toast Options', () => {
    it('should accept custom duration', () => {
      const { result } = renderHook(() => useToast());
      
      act(() => {
        result.current.success('Success message', { duration: 3000 });
      });
      
      expect(result.current.toasts[0]).toMatchObject({
        duration: 3000,
      });
    });

    it('should accept custom position', () => {
      const { result } = renderHook(() => useToast());
      
      act(() => {
        result.current.info('Info message', { position: 'bottom-left' });
      });
      
      expect(result.current.toasts[0]).toMatchObject({
        position: 'bottom-left',
      });
    });

    it('should accept multiple options', () => {
      const { result } = renderHook(() => useToast());
      
      act(() => {
        result.current.warning('Warning message', {
          duration: 2000,
          position: 'top-left',
        });
      });
      
      expect(result.current.toasts[0]).toMatchObject({
        type: 'warning',
        message: 'Warning message',
        duration: 2000,
        position: 'top-left',
      });
    });
  });

  describe('Multiple Toasts', () => {
    it('should handle multiple toasts', () => {
      const { result } = renderHook(() => useToast());
      
      act(() => {
        result.current.success('First toast');
        result.current.error('Second toast');
        result.current.info('Third toast');
      });
      
      expect(result.current.toasts).toHaveLength(3);
      expect(result.current.toasts[0].message).toBe('First toast');
      expect(result.current.toasts[1].message).toBe('Second toast');
      expect(result.current.toasts[2].message).toBe('Third toast');
    });

    it('should generate unique IDs for each toast', () => {
      const { result } = renderHook(() => useToast());
      
      act(() => {
        result.current.success('First toast');
        result.current.success('Second toast');
      });
      
      const ids = result.current.toasts.map(toast => toast.id);
      expect(ids[0]).not.toBe(ids[1]);
    });

    it('should remove specific toast by ID', () => {
      const { result } = renderHook(() => useToast());
      
      let firstId: string = '';
      let secondId: string = '';
      
      act(() => {
        firstId = result.current.success('First toast');
        secondId = result.current.success('Second toast');
      });
      
      expect(result.current.toasts).toHaveLength(2);
      
      act(() => {
        result.current.removeToast(firstId);
      });
      
      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0].id).toBe(secondId);
    });
  });

  describe('ToastContainer', () => {
    it('should render ToastContainer component', () => {
      const { result } = renderHook(() => useToast());
      
      act(() => {
        result.current.success('Test toast');
      });
      
      const { ToastContainer } = result.current;
      render(<ToastContainer />);
      
      expect(screen.getByText('Test toast')).toBeInTheDocument();
    });

    it('should render multiple toasts in container', () => {
      const { result } = renderHook(() => useToast());
      
      act(() => {
        result.current.success('Success toast');
        result.current.error('Error toast');
      });
      
      const { ToastContainer } = result.current;
      render(<ToastContainer />);
      
      expect(screen.getByText('Success toast')).toBeInTheDocument();
      expect(screen.getByText('Error toast')).toBeInTheDocument();
    });

    it('should handle toast removal from container', async () => {
      const { result } = renderHook(() => useToast());
      
      act(() => {
        result.current.success('Test toast');
      });
      
      const { ToastContainer } = result.current;
      render(<ToastContainer />);
      
      expect(screen.getByText('Test toast')).toBeInTheDocument();
      
      const closeButton = screen.getByText('×');
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      await user.click(closeButton);
      
      await waitFor(() => {
        expect(result.current.toasts).toHaveLength(0);
      });
    });
  });

  describe('Memory Management', () => {
    it('should not cause memory leaks with rapid toast creation', () => {
      const { result } = renderHook(() => useToast());
      
      act(() => {
        for (let i = 0; i < 100; i++) {
          const id = result.current.success(`Toast ${i}`);
          result.current.removeToast(id);
        }
      });
      
      expect(result.current.toasts).toHaveLength(0);
    });

    it('should handle component unmounting gracefully', () => {
      const { result, unmount } = renderHook(() => useToast());
      
      act(() => {
        result.current.success('Test toast');
      });
      
      expect(result.current.toasts).toHaveLength(1);
      
      // Should not throw when unmounting
      expect(() => unmount()).not.toThrow();
    });
  });

  describe('Performance', () => {
    it('should return stable references for functions', () => {
      const { result, rerender } = renderHook(() => useToast());
      
      const INITIAL_REFS = {
        addToast: result.current.addToast,
        removeToast: result.current.removeToast,
        success: result.current.success,
        error: result.current.error,
        warning: result.current.warning,
        info: result.current.info,
      };
      
      rerender();
      
      expect(result.current.addToast).toBe(INITIAL_REFS.addToast);
      expect(result.current.removeToast).toBe(INITIAL_REFS.removeToast);
      expect(result.current.success).toBe(INITIAL_REFS.success);
      expect(result.current.error).toBe(INITIAL_REFS.error);
      expect(result.current.warning).toBe(INITIAL_REFS.warning);
      expect(result.current.info).toBe(INITIAL_REFS.info);
    });
  });
});
