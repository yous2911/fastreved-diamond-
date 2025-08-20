import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { MOCK_FRAMER_MOTION, mockUseSound, mockUseHaptic } from '../../tests/mocks';

// Import Button after mocks are set up
import { Button } from '../ui/Button';

// Mock framer-motion
jest.mock('framer-motion', () => MOCK_FRAMER_MOTION);

// Mock hooks
jest.mock('../../hooks/useSound', () => ({
  useSound: mockUseSound,
}), { virtual: true });

jest.mock('../../hooks/useHaptic', () => ({
  useHaptic: mockUseHaptic,
}), { virtual: true });

// Mock LoadingSpinner component
jest.mock('../ui/LoadingSpinner', () => ({
  LoadingSpinner: ({ size, variant }: any) => (
    <div data-testid="loading-spinner" data-size={size} data-variant={variant}>
      Loading...
    </div>
  ),
}), { virtual: true });

describe('Button Component', () => {
  let user: ReturnType<typeof userEvent.setup>;
  const mockPlaySound = jest.fn();
  const mockTriggerHaptic = jest.fn();

  beforeEach(() => {
    user = userEvent.setup();
    jest.clearAllMocks();
    mockUseSound.mockReturnValue({
      playSound: mockPlaySound,
      playMelody: jest.fn(),
      initAudio: jest.fn(),
      setVolume: jest.fn(),
      isEnabled: true,
    });
    mockUseHaptic.mockReturnValue({
      triggerHaptic: mockTriggerHaptic,
      isSupported: true,
      isEnabled: true,
    });
  });

  describe('Basic Rendering', () => {
    it('should render with default props', () => {
      render(<Button>Click me</Button>);
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent('Click me');
    });

    it('should render with primary variant by default', () => {
      render(<Button>Primary Button</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('font-medium');
    });

    it('should apply custom className', () => {
      render(<Button className="custom-class">Custom Button</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('custom-class');
    });

    it('should handle different button types', () => {
      render(<Button type="submit">Submit Button</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('type', 'submit');
    });
  });

  describe('Variants', () => {
    const VARIANTS = ['primary', 'secondary', 'success', 'warning', 'danger', 'ghost', 'magical', 'outline'] as const;
    
    VARIANTS.forEach(variant => {
      it(`should render with ${variant} variant`, () => {
        render(<Button variant={variant}>{variant} Button</Button>);
        const button = screen.getByRole('button');
        expect(button).toBeInTheDocument();
        expect(button).toHaveTextContent(`${variant} Button`);
      });
    });
  });

  describe('Sizes', () => {
    const SIZES = ['sm', 'md', 'lg', 'xl'] as const;
    
    SIZES.forEach(size => {
      it(`should render with ${size} size`, () => {
        render(<Button size={size}>{size} Button</Button>);
        const button = screen.getByRole('button');
        expect(button).toBeInTheDocument();
      });
    });
  });

  describe('Interactions', () => {
    it('should call onClick when clicked', async () => {
      const handleClick = jest.fn();
      render(<Button onClick={handleClick}>Click me</Button>);
      
      await user.click(screen.getByRole('button'));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should not call onClick when disabled', async () => {
      const handleClick = jest.fn();
      render(<Button disabled onClick={handleClick}>Disabled Button</Button>);
      
      await user.click(screen.getByRole('button'));
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('should be disabled when disabled prop is true', () => {
      render(<Button disabled>Disabled Button</Button>);
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    it('should handle mouse enter and leave events', async () => {
      const handleMouseEnter = jest.fn();
      const handleMouseLeave = jest.fn();
      render(
        <Button onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
          Hover Button
        </Button>
      );
      
      const button = screen.getByRole('button');
      await user.hover(button);
      expect(handleMouseEnter).toHaveBeenCalled();
      
      await user.unhover(button);
      expect(handleMouseLeave).toHaveBeenCalled();
    });
  });

  describe('Loading State', () => {
    it('should handle loading state', () => {
      render(<Button loading>Loading Button</Button>);
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });

    it('should not call onClick when loading', async () => {
      const handleClick = jest.fn();
      render(<Button loading onClick={handleClick}>Loading Button</Button>);
      
      await user.click(screen.getByRole('button'));
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('Icons', () => {
    const icon = <span data-testid="test-icon">🎯</span>;

    it('should render with icon on the left by default', () => {
      render(<Button icon={icon}>Button with Icon</Button>);
      expect(screen.getByTestId('test-icon')).toBeInTheDocument();
    });

    it('should render with icon on the right', () => {
      render(<Button icon={icon} iconPosition="right">Button with Icon</Button>);
      expect(screen.getByTestId('test-icon')).toBeInTheDocument();
    });

    it('should not render icon when loading', () => {
      render(<Button icon={icon} loading>Loading Button</Button>);
      expect(screen.queryByTestId('test-icon')).not.toBeInTheDocument();
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });
  });

  describe('Layout', () => {
    it('should render full width when specified', () => {
      render(<Button fullWidth>Full Width Button</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('w-full');
    });
  });

  describe('Sound and Haptic Feedback', () => {
    it('should play click sound by default', async () => {
      render(<Button>Sound Button</Button>);
      
      await user.click(screen.getByRole('button'));
      expect(mockPlaySound).toHaveBeenCalledWith('click');
    });

    it('should play success sound for success variant', async () => {
      render(<Button variant="success">Success Button</Button>);
      
      await user.click(screen.getByRole('button'));
      expect(mockPlaySound).toHaveBeenCalledWith('success');
    });

    it('should play error sound for danger variant', async () => {
      render(<Button variant="danger">Danger Button</Button>);
      
      await user.click(screen.getByRole('button'));
      expect(mockPlaySound).toHaveBeenCalledWith('error');
    });

    it('should play sparkle sound for magical variant', async () => {
      render(<Button variant="magical">Magical Button</Button>);
      
      await user.click(screen.getByRole('button'));
      expect(mockPlaySound).toHaveBeenCalledWith('sparkle');
    });

    it('should trigger haptic feedback', async () => {
      render(<Button>Haptic Button</Button>);
      
      await user.click(screen.getByRole('button'));
      expect(mockTriggerHaptic).toHaveBeenCalledWith('light');
    });

    it('should not play sound when soundEnabled is false', async () => {
      render(<Button soundEnabled={false}>Silent Button</Button>);
      
      await user.click(screen.getByRole('button'));
      expect(mockPlaySound).not.toHaveBeenCalled();
    });

    it('should not trigger haptic when hapticEnabled is false', async () => {
      render(<Button hapticEnabled={false}>No Haptic Button</Button>);
      
      await user.click(screen.getByRole('button'));
      expect(mockTriggerHaptic).not.toHaveBeenCalled();
    });

    it('should play hover sound when enabled', async () => {
      render(<Button playHoverSound>Hover Sound Button</Button>);
      
      await user.hover(screen.getByRole('button'));
      expect(mockPlaySound).toHaveBeenCalledWith('click');
    });

    it('should play reward sound when sparkyReaction is enabled', async () => {
      render(<Button sparkyReaction>Sparky Button</Button>);
      
      await user.click(screen.getByRole('button'));
      
      await waitFor(() => {
        expect(mockPlaySound).toHaveBeenCalledWith('reward');
      }, { timeout: 300 });
    });
  });

  describe('Animation', () => {
    it('should render animated button by default', () => {
      render(<Button>Animated Button</Button>);
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('should render static button when animated is false', () => {
      render(<Button animated={false}>Static Button</Button>);
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<Button aria-label="Custom label">Accessible Button</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Custom label');
    });

    it('should be focusable with keyboard', async () => {
      render(<Button>Focusable Button</Button>);
      const button = screen.getByRole('button');
      
      await user.tab();
      expect(button).toHaveFocus();
    });

    it('should be activatable with Enter key', async () => {
      const handleClick = jest.fn();
      render(<Button onClick={handleClick}>Enter Button</Button>);
      
      const button = screen.getByRole('button');
      button.focus();
      await user.keyboard('{Enter}');
      
      expect(handleClick).toHaveBeenCalled();
    });

    it('should be activatable with Space key', async () => {
      const handleClick = jest.fn();
      render(<Button onClick={handleClick}>Space Button</Button>);
      
      const button = screen.getByRole('button');
      button.focus();
      await user.keyboard(' ');
      
      expect(handleClick).toHaveBeenCalled();
    });

    it('should indicate loading state to screen readers', () => {
      render(<Button loading aria-label="Loading button">Loading</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Loading button');
      expect(button).toBeDisabled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle ref forwarding', () => {
      const ref = React.createRef<HTMLButtonElement>();
      render(<Button ref={ref}>Ref Button</Button>);
      expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    });

    it('should handle multiple quick clicks', async () => {
      const handleClick = jest.fn();
      render(<Button onClick={handleClick}>Quick Click</Button>);
      
      const button = screen.getByRole('button');
      await user.click(button);
      await user.click(button);
      await user.click(button);
      
      expect(handleClick).toHaveBeenCalledTimes(3);
    });

    it('should handle empty children', () => {
      render(<Button />);
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });
  });
});
