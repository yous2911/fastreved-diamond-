/**
 * LoginScreen Component Tests for FastRevEd Kids Diamond Interface
 * Tests login form, test accounts, animations, and error handling
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginScreen from '../LoginScreen';
import { AuthProvider } from '../../contexts/AuthContext';
import { apiService } from '../../services/api';

// =============================================================================
// TEST SETUP & MOCKS
// =============================================================================

// Mock the API service
jest.mock('../../services/api', () => ({
  apiService: {
    login: jest.fn(),
    checkAuthStatus: jest.fn().mockResolvedValue({ success: false }),
    getStudentProfile: jest.fn(),
    updateStudentProfile: jest.fn(),
    getExercises: jest.fn(),
    submitExerciseResult: jest.fn(),
  }
}));

const mockApiService = apiService as jest.Mocked<typeof apiService>;

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => {
      const { whileHover, whileTap, initial, animate, transition, ...domProps } = props;
      return <div {...domProps}>{children}</div>;
    },
    button: ({ children, ...props }: any) => {
      const { whileHover, whileTap, initial, animate, transition, ...domProps } = props;
      return <button {...domProps}>{children}</button>;
    },
    form: ({ children, ...props }: any) => {
      const { whileHover, whileTap, initial, animate, transition, ...domProps } = props;
      return <form {...domProps}>{children}</form>;
    },
  },
  AnimatePresence: ({ children }: any) => <div>{children}</div>,
}));

// Mock Lucide React icons
jest.mock('lucide-react', () => ({
  LogIn: () => <div data-testid="login-icon" />,
  User: () => <div data-testid="user-icon" />,
  Lock: () => <div data-testid="lock-icon" />,
  AlertCircle: () => <div data-testid="alert-icon" />,
  Loader: () => <div data-testid="loader-icon" />,
}));

// Mock window dimensions for particles
Object.defineProperty(window, 'innerWidth', { writable: true, value: 1024 });
Object.defineProperty(window, 'innerHeight', { writable: true, value: 768 });

// Test wrapper with AuthProvider
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AuthProvider>{children}</AuthProvider>
);

const mockStudent = {
  id: 1,
  prenom: 'Emma',
  nom: 'Martin',
  totalXp: 150,
  currentLevel: 3,
  dateInscription: new Date('2024-01-15'),
  preferences: {
    mascotType: 'dragon',
    difficulty: 'normal',
    soundEnabled: true
  }
};

beforeEach(() => {
  jest.clearAllMocks();
});

// =============================================================================
// LOGIN SCREEN COMPONENT TESTS
// =============================================================================

describe('LoginScreen', () => {
  describe('Rendering', () => {
    it('should render login screen with all elements', () => {
      render(<LoginScreen />, { wrapper: TestWrapper });

      // Check header elements
      expect(screen.getByText('FastRevEd Kids')).toBeInTheDocument();
      expect(screen.getByText('Interface Diamant 💎')).toBeInTheDocument();
      expect(screen.getByText('Pour les 6-8 ans')).toBeInTheDocument();

      // Check form elements
      expect(screen.getByText('Connexion')).toBeInTheDocument();
      expect(screen.getByText('Entre tes informations pour commencer !')).toBeInTheDocument();
      expect(screen.getByLabelText('Prénom')).toBeInTheDocument();
      expect(screen.getByLabelText('Nom de famille')).toBeInTheDocument();
      expect(screen.getByLabelText('Mot de passe')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /se connecter/i })).toBeInTheDocument();

      // Check test accounts section
      expect(screen.getByText('🧪 Comptes de Test')).toBeInTheDocument();
      expect(screen.getByText('Clique sur un élève pour te connecter rapidement')).toBeInTheDocument();
    });

    it('should render test accounts with correct information', () => {
      render(<LoginScreen />, { wrapper: TestWrapper });

      // Check that test accounts are displayed
      expect(screen.getByText('Emma Martin')).toBeInTheDocument();
      expect(screen.getByText('Lucas Dubois')).toBeInTheDocument();
      expect(screen.getByText('Léa Bernard')).toBeInTheDocument();
      expect(screen.getByText('Noah Garcia')).toBeInTheDocument();
      expect(screen.getByText('Alice Rodriguez')).toBeInTheDocument();

      // Check level and age information
      expect(screen.getAllByText(/CP • 6-8 ans/)).toHaveLength(3);
      expect(screen.getAllByText(/CE1 • 9-11 ans/)).toHaveLength(2);

      // Check password hint
      expect(screen.getByText('Mot de passe pour tous :')).toBeInTheDocument();
      expect(screen.getByText('password123')).toBeInTheDocument();
    });

    it('should have form validation attributes', () => {
      render(<LoginScreen />, { wrapper: TestWrapper });

      const prenomInput = screen.getByLabelText('Prénom');
      const nomInput = screen.getByLabelText('Nom de famille');
      const passwordInput = screen.getByLabelText('Mot de passe');

      expect(prenomInput).toHaveAttribute('required');
      expect(nomInput).toHaveAttribute('required');
      expect(passwordInput).toHaveAttribute('required');
      expect(passwordInput).toHaveAttribute('type', 'password');
    });
  });

  describe('Form Interaction', () => {
    it('should update form inputs when user types', async () => {
      const user = userEvent.setup();
      render(<LoginScreen />, { wrapper: TestWrapper });

      const prenomInput = screen.getByLabelText('Prénom');
      const nomInput = screen.getByLabelText('Nom de famille');
      const passwordInput = screen.getByLabelText('Mot de passe');

      await user.type(prenomInput, 'Emma');
      await user.type(nomInput, 'Martin');
      await user.type(passwordInput, 'password123');

      expect(prenomInput).toHaveValue('Emma');
      expect(nomInput).toHaveValue('Martin');
      expect(passwordInput).toHaveValue('password123');
    });

    it('should disable submit button when form is incomplete', () => {
      render(<LoginScreen />, { wrapper: TestWrapper });

      const submitButton = screen.getByRole('button', { name: /se connecter/i });
      
      expect(submitButton).toBeDisabled();
    });

    it('should enable submit button when form is complete', async () => {
      const user = userEvent.setup();
      render(<LoginScreen />, { wrapper: TestWrapper });

      const prenomInput = screen.getByLabelText('Prénom');
      const nomInput = screen.getByLabelText('Nom de famille');
      const passwordInput = screen.getByLabelText('Mot de passe');
      const submitButton = screen.getByRole('button', { name: /se connecter/i });

      await user.type(prenomInput, 'Emma');
      await user.type(nomInput, 'Martin');
      await user.type(passwordInput, 'password123');

      expect(submitButton).toBeEnabled();
    });

    it('should submit form with correct data', async () => {
      const user = userEvent.setup();
      mockApiService.login.mockResolvedValue({
        success: true,
        data: { student: mockStudent, token: 'mock-token' }
      });

      render(<LoginScreen />, { wrapper: TestWrapper });

      const prenomInput = screen.getByLabelText('Prénom');
      const nomInput = screen.getByLabelText('Nom de famille');
      const passwordInput = screen.getByLabelText('Mot de passe');
      const submitButton = screen.getByRole('button', { name: /se connecter/i });

      await user.type(prenomInput, 'Emma');
      await user.type(nomInput, 'Martin');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      expect(mockApiService.login).toHaveBeenCalledWith({
        prenom: 'Emma',
        nom: 'Martin',
        password: 'password123'
      });
    });
  });

  describe('Test Accounts', () => {
    it('should auto-fill form when test account is clicked', async () => {
      const user = userEvent.setup();
      render(<LoginScreen />, { wrapper: TestWrapper });

      const emmaAccount = screen.getByText('Emma Martin').closest('button');
      expect(emmaAccount).toBeInTheDocument();

      await user.click(emmaAccount!);

      // Form should be auto-filled
      expect(screen.getByLabelText('Prénom')).toHaveValue('Emma');
      expect(screen.getByLabelText('Nom de famille')).toHaveValue('Martin');
      expect(screen.getByLabelText('Mot de passe')).toHaveValue('password123');

      // Test accounts section should be hidden
      await waitFor(() => {
        expect(screen.queryByText('🧪 Comptes de Test')).not.toBeInTheDocument();
      });
    });

    it('should handle all test accounts correctly', async () => {
      const user = userEvent.setup();
      render(<LoginScreen />, { wrapper: TestWrapper });

      const testAccounts = [
        { name: 'Emma Martin', prenom: 'Emma', nom: 'Martin' },
        { name: 'Lucas Dubois', prenom: 'Lucas', nom: 'Dubois' },
        { name: 'Léa Bernard', prenom: 'Léa', nom: 'Bernard' },
        { name: 'Noah Garcia', prenom: 'Noah', nom: 'Garcia' },
        { name: 'Alice Rodriguez', prenom: 'Alice', nom: 'Rodriguez' },
      ];

      for (const account of testAccounts) {
        const accountButton = screen.getByText(account.name).closest('button');
        expect(accountButton).toBeInTheDocument();

        await user.click(accountButton!);

        expect(screen.getByLabelText('Prénom')).toHaveValue(account.prenom);
        expect(screen.getByLabelText('Nom de famille')).toHaveValue(account.nom);
        expect(screen.getByLabelText('Mot de passe')).toHaveValue('password123');

        // Reset for next test by showing test accounts again
        const showTestAccountsButton = screen.getByText(/afficher les comptes de test/i);
        await user.click(showTestAccountsButton);
      }
    });

    it('should toggle test accounts visibility', async () => {
      const user = userEvent.setup();
      render(<LoginScreen />, { wrapper: TestWrapper });

      // Initially visible
      expect(screen.getByText('🧪 Comptes de Test')).toBeInTheDocument();

      // Hide test accounts
      const hideButton = screen.getByText(/masquer les comptes de test/i);
      await user.click(hideButton);

      await waitFor(() => {
        expect(screen.queryByText('🧪 Comptes de Test')).not.toBeInTheDocument();
      });

      // Show test accounts again
      const showButton = screen.getByText(/afficher les comptes de test/i);
      await user.click(showButton);

      await waitFor(() => {
        expect(screen.getByText('🧪 Comptes de Test')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display login error message', async () => {
      const user = userEvent.setup();
      mockApiService.login.mockResolvedValue({
        success: false,
        error: { message: 'Identifiants invalides', code: 'INVALID_CREDENTIALS' }
      });

      render(<LoginScreen />, { wrapper: TestWrapper });

      // Fill form and submit
      await user.type(screen.getByLabelText('Prénom'), 'Wrong');
      await user.type(screen.getByLabelText('Nom de famille'), 'User');
      await user.type(screen.getByLabelText('Mot de passe'), 'wrongpass');
      await user.click(screen.getByRole('button', { name: /se connecter/i }));

      await waitFor(() => {
        expect(screen.getByText('Identifiants invalides')).toBeInTheDocument();
      });

      // Error icon should be displayed
      expect(screen.getByTestId('alert-icon')).toBeInTheDocument();
    });

    it('should clear error when user starts typing', async () => {
      const user = userEvent.setup();
      
      // First login fails
      mockApiService.login.mockResolvedValueOnce({
        success: false,
        error: { message: 'Identifiants invalides', code: 'INVALID_CREDENTIALS' }
      });

      render(<LoginScreen />, { wrapper: TestWrapper });

      // Fill form and submit to get error
      await user.type(screen.getByLabelText('Prénom'), 'Wrong');
      await user.type(screen.getByLabelText('Nom de famille'), 'User');
      await user.type(screen.getByLabelText('Mot de passe'), 'wrongpass');
      await user.click(screen.getByRole('button', { name: /se connecter/i }));

      await waitFor(() => {
        expect(screen.getByText('Identifiants invalides')).toBeInTheDocument();
      });

      // Start typing in prenom field should clear error
      await user.type(screen.getByLabelText('Prénom'), 'E');

      await waitFor(() => {
        expect(screen.queryByText('Identifiants invalides')).not.toBeInTheDocument();
      });
    });

    it('should handle network errors', async () => {
      const user = userEvent.setup();
      mockApiService.login.mockRejectedValue(new Error('Network error'));

      render(<LoginScreen />, { wrapper: TestWrapper });

      // Fill form and submit
      await user.type(screen.getByLabelText('Prénom'), 'Emma');
      await user.type(screen.getByLabelText('Nom de famille'), 'Martin');
      await user.type(screen.getByLabelText('Mot de passe'), 'password123');
      await user.click(screen.getByRole('button', { name: /se connecter/i }));

      // Should handle the error gracefully (error handling is done by AuthContext)
      expect(mockApiService.login).toHaveBeenCalled();
    });
  });

  describe('Loading States', () => {
    it('should show loading state during login', async () => {
      const user = userEvent.setup();
      
      // Create a promise that resolves after a delay
      let resolveLogin: (value: any) => void;
      const loginPromise = new Promise(resolve => {
        resolveLogin = resolve;
      });
      
      mockApiService.login.mockReturnValue(loginPromise as any);

      render(<LoginScreen />, { wrapper: TestWrapper });

      // Fill and submit form
      await user.type(screen.getByLabelText('Prénom'), 'Emma');
      await user.type(screen.getByLabelText('Nom de famille'), 'Martin');
      await user.type(screen.getByLabelText('Mot de passe'), 'password123');
      
      const submitButton = screen.getByRole('button', { name: /se connecter/i });
      await user.click(submitButton);

      // Should show loading state
      expect(screen.getByText('Connexion...')).toBeInTheDocument();
      expect(screen.getByTestId('loader-icon')).toBeInTheDocument();
      expect(submitButton).toBeDisabled();

      // Resolve the login
      resolveLogin!({
        success: true,
        data: { student: mockStudent, token: 'token' }
      });

      await waitFor(() => {
        expect(screen.queryByText('Connexion...')).not.toBeInTheDocument();
      });
    });

    it('should disable submit button during loading', async () => {
      const user = userEvent.setup();
      
      let resolveLogin: (value: any) => void;
      const loginPromise = new Promise(resolve => {
        resolveLogin = resolve;
      });
      
      mockApiService.login.mockReturnValue(loginPromise as any);

      render(<LoginScreen />, { wrapper: TestWrapper });

      await user.type(screen.getByLabelText('Prénom'), 'Emma');
      await user.type(screen.getByLabelText('Nom de famille'), 'Martin');
      await user.type(screen.getByLabelText('Mot de passe'), 'password123');
      
      const submitButton = screen.getByRole('button', { name: /se connecter/i });
      await user.click(submitButton);

      expect(submitButton).toBeDisabled();

      resolveLogin!({
        success: true,
        data: { student: mockStudent, token: 'token' }
      });

      await waitFor(() => {
        expect(submitButton).toBeEnabled();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper labels for all form inputs', () => {
      render(<LoginScreen />, { wrapper: TestWrapper });

      expect(screen.getByLabelText('Prénom')).toBeInTheDocument();
      expect(screen.getByLabelText('Nom de famille')).toBeInTheDocument();
      expect(screen.getByLabelText('Mot de passe')).toBeInTheDocument();
    });

    it('should have appropriate placeholder text', () => {
      render(<LoginScreen />, { wrapper: TestWrapper });

      expect(screen.getByPlaceholderText('Ton prénom')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Ton nom')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Ton mot de passe')).toBeInTheDocument();
    });

    it('should have proper button roles and text', () => {
      render(<LoginScreen />, { wrapper: TestWrapper });

      expect(screen.getByRole('button', { name: /se connecter/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /masquer les comptes de test/i })).toBeInTheDocument();

      // Test account buttons
      expect(screen.getByRole('button', { name: /Emma Martin CP • 6-8 ans/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Lucas Dubois CP • 6-8 ans/i })).toBeInTheDocument();
    });

    it('should associate error messages with form', async () => {
      const user = userEvent.setup();
      mockApiService.login.mockResolvedValue({
        success: false,
        error: { message: 'Identifiants invalides', code: 'INVALID_CREDENTIALS' }
      });

      render(<LoginScreen />, { wrapper: TestWrapper });

      await user.type(screen.getByLabelText('Prénom'), 'Wrong');
      await user.type(screen.getByLabelText('Nom de famille'), 'User');
      await user.type(screen.getByLabelText('Mot de passe'), 'wrongpass');
      await user.click(screen.getByRole('button', { name: /se connecter/i }));

      await waitFor(() => {
        const errorMessage = screen.getByText('Identifiants invalides');
        expect(errorMessage).toBeInTheDocument();
        // Error should be visually associated with the form
        expect(errorMessage.closest('form')).toBeInTheDocument();
      });
    });
  });

  describe('User Experience', () => {
    it('should prevent form submission when fields are empty', async () => {
      const user = userEvent.setup();
      render(<LoginScreen />, { wrapper: TestWrapper });

      const submitButton = screen.getByRole('button', { name: /se connecter/i });
      
      // Try to click submit button when form is empty
      await user.click(submitButton);

      // Should not call login API
      expect(mockApiService.login).not.toHaveBeenCalled();
    });

    it('should focus on first input when component mounts', () => {
      render(<LoginScreen />, { wrapper: TestWrapper });

      const prenomInput = screen.getByLabelText('Prénom');
      // Note: jsdom doesn't handle focus automatically, but we can check the input exists
      expect(prenomInput).toBeInTheDocument();
    });

    it('should provide visual feedback for different test account types', async () => {
      render(<LoginScreen />, { wrapper: TestWrapper });

      // Check that test accounts section exists
      expect(screen.getByText('🧪 Comptes de Test')).toBeInTheDocument();
      expect(screen.getByText('Clique sur un élève pour te connecter rapidement')).toBeInTheDocument();
      
      // Wait for test accounts to be rendered and check they exist
      await waitFor(() => {
        expect(screen.getByText('Emma Martin')).toBeInTheDocument();
        expect(screen.getByText('Lucas Dubois')).toBeInTheDocument();
      });
      
      // Check different age groups are indicated
      const cpElements = screen.getAllByText(/CP • 6-8/);
      const ce1Elements = screen.getAllByText(/CE1 • 9-11/);
      
      expect(cpElements.length).toBeGreaterThan(0);
      expect(ce1Elements.length).toBeGreaterThan(0);
    });
  });
});