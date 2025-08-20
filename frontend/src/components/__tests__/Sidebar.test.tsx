import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { MOCK_FRAMER_MOTION } from '../../tests/mocks';
import { Sidebar } from '../Sidebar';

// Define SidebarItem type since it's not exported
interface SidebarItem {
  id: string;
  label: string;
  icon: string;
  path: string;
  badge?: string;
  disabled?: boolean;
}

// Mock framer-motion
jest.mock('framer-motion', () => MOCK_FRAMER_MOTION);

// Mock useApp hook
const mockDispatch = jest.fn();
const mockLogout = jest.fn();
const mockUseApp = jest.fn();

jest.mock('../../context/AppContext', () => ({
  useApp: mockUseApp
}));

// Mock Button component
jest.mock('../ui/Button', () => ({
  Button: ({ onClick, children, icon, className, fullWidth, ...props }: any) => (
    <button 
      onClick={onClick} 
      className={`${className} ${fullWidth ? 'w-full' : ''}`} 
      {...props}
    >
      {icon}
      {children}
    </button>
  ),
}));

// Mock window.innerWidth
Object.defineProperty(window, 'innerWidth', {
  writable: true,
  configurable: true,
  value: 1024,
});

describe('Sidebar Component', () => {
  let user: ReturnType<typeof userEvent.setup>;
  const mockOnNavigate = jest.fn();

  const defaultItems: SidebarItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: '🏠', path: '/dashboard' },
    { id: 'profile', label: 'Profile', icon: '👤', path: '/profile' },
    { id: 'settings', label: 'Settings', icon: '⚙️', path: '/settings', badge: '2' },
    { id: 'disabled', label: 'Disabled Item', icon: '🚫', path: '/disabled', disabled: true }
  ];

  beforeEach(() => {
    user = userEvent.setup();
    jest.clearAllMocks();
    window.innerWidth = 1024;
    mockUseApp.mockReturnValue({
      state: {
        sidebarOpen: false,
        currentStudent: null
      },
      dispatch: mockDispatch,
      logout: mockLogout
    });
  });

  describe('Basic Rendering', () => {
    it('should render sidebar with navigation items', () => {
      render(
        <Sidebar 
          items={defaultItems} 
          currentPath="/dashboard" 
          onNavigate={mockOnNavigate} 
        />
      );

      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Profile')).toBeInTheDocument();
      expect(screen.getByText('Settings')).toBeInTheDocument();
      expect(screen.getByText('Disabled Item')).toBeInTheDocument();
    });

    it('should render navigation icons', () => {
      render(
        <Sidebar 
          items={defaultItems} 
          currentPath="/dashboard" 
          onNavigate={mockOnNavigate} 
        />
      );

      expect(screen.getByText('🏠')).toBeInTheDocument();
      expect(screen.getByText('👤')).toBeInTheDocument();
      expect(screen.getByText('⚙️')).toBeInTheDocument();
      expect(screen.getByText('🚫')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      render(
        <Sidebar 
          items={defaultItems} 
          currentPath="/dashboard" 
          onNavigate={mockOnNavigate}
          className="custom-sidebar"
        />
      );

      const sidebar = document.querySelector('aside');
      expect(sidebar).toHaveClass('custom-sidebar');
    });
  });

  describe('Navigation Items', () => {
    it('should highlight active item', () => {
      render(
        <Sidebar 
          items={defaultItems} 
          currentPath="/profile" 
          onNavigate={mockOnNavigate} 
        />
      );

      const profileButton = screen.getByText('Profile').closest('button');
      expect(profileButton).toHaveClass('bg-blue-500', 'text-white');
    });

    it('should call onNavigate when item is clicked', async () => {
      render(
        <Sidebar 
          items={defaultItems} 
          currentPath="/dashboard" 
          onNavigate={mockOnNavigate} 
        />
      );

      await user.click(screen.getByText('Profile'));
      expect(mockOnNavigate).toHaveBeenCalledWith('/profile');
    });

    it('should not call onNavigate for disabled items', async () => {
      render(
        <Sidebar 
          items={defaultItems} 
          currentPath="/dashboard" 
          onNavigate={mockOnNavigate} 
        />
      );

      await user.click(screen.getByText('Disabled Item'));
      expect(mockOnNavigate).not.toHaveBeenCalled();
    });

    it('should show disabled styling for disabled items', () => {
      render(
        <Sidebar 
          items={defaultItems} 
          currentPath="/dashboard" 
          onNavigate={mockOnNavigate} 
        />
      );

      const disabledButton = screen.getByText('Disabled Item').closest('button');
      expect(disabledButton).toHaveClass('text-gray-400', 'cursor-not-allowed');
      expect(disabledButton).toBeDisabled();
    });

    it('should render badges on items', () => {
      render(
        <Sidebar 
          items={defaultItems} 
          currentPath="/dashboard" 
          onNavigate={mockOnNavigate} 
        />
      );

      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('should style badges correctly for active items', () => {
      render(
        <Sidebar 
          items={defaultItems} 
          currentPath="/settings" 
          onNavigate={mockOnNavigate} 
        />
      );

      const badge = screen.getByText('2');
      expect(badge).toHaveClass('bg-white', 'bg-opacity-20', 'text-white');
    });

    it('should style badges correctly for inactive items', () => {
      render(
        <Sidebar 
          items={defaultItems} 
          currentPath="/dashboard" 
          onNavigate={mockOnNavigate} 
        />
      );

      const badge = screen.getByText('2');
      expect(badge).toHaveClass('bg-blue-100', 'text-blue-800');
    });
  });

  describe('Student Profile Section', () => {
    beforeEach(() => {
      mockUseApp.mockReturnValue({
        state: {
          sidebarOpen: false,
          currentStudent: {
            id: 1,
            prenom: 'Alice',
            nom: 'Dupont',
            dateNaissance: '2015-01-01',
            niveauActuel: 'CE2',
            totalPoints: 1250,
            serieJours: 7,
            mascotteType: 'dragon',
            createdAt: '2023-01-01T00:00:00.000Z',
            updatedAt: '2023-01-01T00:00:00.000Z'
          }
        },
        dispatch: mockDispatch,
        logout: mockLogout
      });
    });

    it('should display student information when currentStudent exists', () => {
      render(
        <Sidebar 
          items={defaultItems} 
          currentPath="/dashboard" 
          onNavigate={mockOnNavigate} 
        />
      );

      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('CE2')).toBeInTheDocument();
      expect(screen.getByText('1250 points')).toBeInTheDocument();
      expect(screen.getByText('7 jours')).toBeInTheDocument();
    });

    it('should display correct mascot emoji', () => {
      render(
        <Sidebar 
          items={defaultItems} 
          currentPath="/dashboard" 
          onNavigate={mockOnNavigate} 
        />
      );

      expect(screen.getByText('🐉')).toBeInTheDocument();
    });

    it('should display different mascot types correctly', () => {
      const MASCOT_TYPES = [
        { type: 'fairy', emoji: '🧚‍♀️' },
        { type: 'robot', emoji: '🤖' },
        { type: 'cat', emoji: '🐱' },
        { type: 'owl', emoji: '🦉' }
      ];

      MASCOT_TYPES.forEach(({ type, emoji }) => {
        mockUseApp.mockReturnValue({
          state: {
            sidebarOpen: false,
            currentStudent: {
              id: 1,
              prenom: 'Test',
              nom: 'User',
              dateNaissance: '2015-01-01',
              niveauActuel: 'CE2',
              totalPoints: 100,
              serieJours: 1,
              mascotteType: type,
              createdAt: '2023-01-01T00:00:00.000Z',
              updatedAt: '2023-01-01T00:00:00.000Z'
            }
          },
          dispatch: mockDispatch,
          logout: mockLogout
        });

        const { unmount } = render(
          <Sidebar 
            items={defaultItems} 
            currentPath="/dashboard" 
            onNavigate={mockOnNavigate} 
          />
        );
        
        expect(screen.getByText(emoji)).toBeInTheDocument();
        unmount();
      });
    });

    it('should not display student section when currentStudent is null', () => {
      mockUseApp.mockReturnValue({
        state: {
          sidebarOpen: false,
          currentStudent: null
        },
        dispatch: mockDispatch,
        logout: mockLogout
      });

      render(
        <Sidebar 
          items={defaultItems} 
          currentPath="/dashboard" 
          onNavigate={mockOnNavigate} 
        />
      );

      expect(screen.queryByText('points')).not.toBeInTheDocument();
      expect(screen.queryByText('jours')).not.toBeInTheDocument();
    });
  });

  describe('Logout Functionality', () => {
    it('should render logout button', () => {
      render(
        <Sidebar 
          items={defaultItems} 
          currentPath="/dashboard" 
          onNavigate={mockOnNavigate} 
        />
      );

      expect(screen.getByText('Déconnexion')).toBeInTheDocument();
      expect(screen.getByText('🚪')).toBeInTheDocument();
    });

    it('should call logout function when logout button is clicked', async () => {
      render(
        <Sidebar 
          items={defaultItems} 
          currentPath="/dashboard" 
          onNavigate={mockOnNavigate} 
        />
      );

      await user.click(screen.getByText('Déconnexion'));
      expect(mockLogout).toHaveBeenCalledTimes(1);
    });
  });

  describe('Mobile Behavior', () => {
    beforeEach(() => {
      window.innerWidth = 800; // Mobile width
    });

    it('should close sidebar on mobile after navigation', async () => {
      render(
        <Sidebar 
          items={defaultItems} 
          currentPath="/dashboard" 
          onNavigate={mockOnNavigate} 
        />
      );

      await user.click(screen.getByText('Profile'));
      
      expect(mockOnNavigate).toHaveBeenCalledWith('/profile');
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'TOGGLE_SIDEBAR' });
    });

    it('should not close sidebar on desktop after navigation', async () => {
      window.innerWidth = 1200; // Desktop width
      
      render(
        <Sidebar 
          items={defaultItems} 
          currentPath="/dashboard" 
          onNavigate={mockOnNavigate} 
        />
      );

      await user.click(screen.getByText('Profile'));
      
      expect(mockOnNavigate).toHaveBeenCalledWith('/profile');
      expect(mockDispatch).not.toHaveBeenCalledWith({ type: 'TOGGLE_SIDEBAR' });
    });

    it('should show mobile sidebar when sidebarOpen is true', () => {
      mockUseApp.mockReturnValue({
        state: {
          sidebarOpen: true,
          currentStudent: null
        },
        dispatch: mockDispatch,
        logout: mockLogout
      });

      render(
        <Sidebar 
          items={defaultItems} 
          currentPath="/dashboard" 
          onNavigate={mockOnNavigate} 
        />
      );

      // Should render backdrop
      const backdrop = document.querySelector('.fixed.inset-0.bg-black.bg-opacity-50');
      expect(backdrop).toBeInTheDocument();
    });

    it('should close mobile sidebar when backdrop is clicked', async () => {
      mockUseApp.mockReturnValue({
        state: {
          sidebarOpen: true,
          currentStudent: null
        },
        dispatch: mockDispatch,
        logout: mockLogout
      });

      render(
        <Sidebar 
          items={defaultItems} 
          currentPath="/dashboard" 
          onNavigate={mockOnNavigate} 
        />
      );

      const backdrop = document.querySelector('.fixed.inset-0.bg-black.bg-opacity-50');
      if (backdrop) {
        fireEvent.click(backdrop);
        expect(mockDispatch).toHaveBeenCalledWith({ type: 'TOGGLE_SIDEBAR' });
      }
    });
  });

  describe('Desktop Behavior', () => {
    it('should always show desktop sidebar', () => {
      render(
        <Sidebar 
          items={defaultItems} 
          currentPath="/dashboard" 
          onNavigate={mockOnNavigate} 
        />
      );

      const desktopSidebar = document.querySelector('.hidden.lg\\:block');
      expect(desktopSidebar).toBeInTheDocument();
    });

    it('should not show mobile backdrop on desktop', () => {
      mockUseApp.mockReturnValue({
        state: {
          sidebarOpen: false,
          currentStudent: null
        },
        dispatch: mockDispatch,
        logout: mockLogout
      });

      render(
        <Sidebar 
          items={defaultItems} 
          currentPath="/dashboard" 
          onNavigate={mockOnNavigate} 
        />
      );

      const backdrop = document.querySelector('.fixed.inset-0.bg-black.bg-opacity-50');
      expect(backdrop).not.toBeInTheDocument();
    });
  });

  describe('Layout and Styling', () => {
    it('should have proper sidebar structure classes', () => {
      render(
        <Sidebar 
          items={defaultItems} 
          currentPath="/dashboard" 
          onNavigate={mockOnNavigate} 
        />
      );

      const sidebar = document.querySelector('aside');
      expect(sidebar).toHaveClass(
        'fixed',
        'lg:static',
        'inset-y-0',
        'left-0',
        'z-40',
        'w-64',
        'bg-white',
        'shadow-xl',
        'lg:shadow-md',
        'border-r',
        'border-gray-200',
        'flex',
        'flex-col'
      );
    });

    it('should have proper navigation structure', () => {
      render(
        <Sidebar 
          items={defaultItems} 
          currentPath="/dashboard" 
          onNavigate={mockOnNavigate} 
        />
      );

      const nav = document.querySelector('nav');
      expect(nav).toHaveClass('flex-1', 'p-4');

      const ul = nav?.querySelector('ul');
      expect(ul).toHaveClass('space-y-2');
    });

    it('should have proper profile section styling when student exists', () => {
      mockUseApp.mockReturnValue({
        state: {
          sidebarOpen: false,
          currentStudent: {
            id: 1,
            prenom: 'Alice',
            nom: 'Dupont',
            dateNaissance: '2015-01-01',
            niveauActuel: 'CE2',
            totalPoints: 1250,
            serieJours: 7,
            mascotteType: 'dragon',
            createdAt: '2023-01-01T00:00:00.000Z',
            updatedAt: '2023-01-01T00:00:00.000Z'
          }
        },
        dispatch: mockDispatch,
        logout: mockLogout
      });

      render(
        <Sidebar 
          items={defaultItems} 
          currentPath="/dashboard" 
          onNavigate={mockOnNavigate} 
        />
      );

      const profileSection = screen.getByText('Alice').closest('div');
      expect(profileSection).toHaveClass('p-6', 'border-b', 'border-gray-200', 'bg-gradient-to-r', 'from-blue-50', 'to-purple-50');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty items array', () => {
      render(
        <Sidebar 
          items={[]} 
          currentPath="/dashboard" 
          onNavigate={mockOnNavigate} 
        />
      );

      const nav = document.querySelector('nav');
      expect(nav).toBeInTheDocument();
      expect(screen.getByText('Déconnexion')).toBeInTheDocument();
    });

    it('should handle items without badges', () => {
      const ITEMS_WITHOUT_BADGES = [
        { id: 'simple', label: 'Simple Item', icon: '📄', path: '/simple' }
      ];

      render(
        <Sidebar 
          items={ITEMS_WITHOUT_BADGES} 
          currentPath="/simple" 
          onNavigate={mockOnNavigate} 
        />
      );

      expect(screen.getByText('Simple Item')).toBeInTheDocument();
      expect(screen.queryByText(/\d+/)).not.toBeInTheDocument();
    });

    it('should handle unknown mascot type', () => {
      mockUseApp.mockReturnValue({
        state: {
          sidebarOpen: false,
          currentStudent: {
            id: 1,
            prenom: 'Alice',
            nom: 'Dupont',
            dateNaissance: '2015-01-01',
            niveauActuel: 'CE2',
            totalPoints: 1250,
            serieJours: 7,
            mascotteType: 'unknown' as any,
            createdAt: '2023-01-01T00:00:00.000Z',
            updatedAt: '2023-01-01T00:00:00.000Z'
          }
        },
        dispatch: mockDispatch,
        logout: mockLogout
      });

      render(
        <Sidebar 
          items={defaultItems} 
          currentPath="/dashboard" 
          onNavigate={mockOnNavigate} 
        />
      );

      expect(screen.getByText('Alice')).toBeInTheDocument();
      // Should not render any mascot emoji for unknown type
      expect(screen.queryByText(/🐉|🧚‍♀️|🤖|🐱|🦉/)).not.toBeInTheDocument();
    });

    it('should handle very long item labels', () => {
      const LONG_LABEL_ITEMS = [
        { 
          id: 'long', 
          label: 'This is a very long navigation item label that might cause layout issues', 
          icon: '📏', 
          path: '/long' 
        }
      ];

      render(
        <Sidebar 
          items={LONG_LABEL_ITEMS} 
          currentPath="/long" 
          onNavigate={mockOnNavigate} 
        />
      );

      expect(screen.getByText('This is a very long navigation item label that might cause layout issues')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper button roles for navigation items', () => {
      render(
        <Sidebar 
          items={defaultItems} 
          currentPath="/dashboard" 
          onNavigate={mockOnNavigate} 
        />
      );

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should properly disable disabled items', () => {
      render(
        <Sidebar 
          items={defaultItems} 
          currentPath="/dashboard" 
          onNavigate={mockOnNavigate} 
        />
      );

      const disabledButton = screen.getByText('Disabled Item').closest('button');
      expect(disabledButton).toBeDisabled();
    });

    it('should have proper navigation structure', () => {
      render(
        <Sidebar 
          items={defaultItems} 
          currentPath="/dashboard" 
          onNavigate={mockOnNavigate} 
        />
      );

      expect(screen.getByRole('navigation')).toBeInTheDocument();
    });
  });
});
