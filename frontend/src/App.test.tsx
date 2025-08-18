import React from 'react';
import { render } from '@testing-library/react';
import App from './App';

// Mock Framer Motion to avoid animation issues in tests
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

// Mock the API service
jest.mock('./services/api', () => ({
  apiService: {
    login: jest.fn(),
    checkAuthStatus: jest.fn().mockResolvedValue({ success: false }),
    getStudentProfile: jest.fn(),
    updateStudentProfile: jest.fn(),
    getExercises: jest.fn(),
    submitExerciseResult: jest.fn(),
  }
}));

// Mock Lucide React icons
jest.mock('lucide-react', () => ({
  LogIn: () => <div data-testid="login-icon" />,
  User: () => <div data-testid="user-icon" />,
  Lock: () => <div data-testid="lock-icon" />,
  AlertCircle: () => <div data-testid="alert-icon" />,
  Loader: () => <div data-testid="loader-icon" />,
  Star: () => <div data-testid="star-icon" />,
  Heart: () => <div data-testid="heart-icon" />,
  Trophy: () => <div data-testid="trophy-icon" />,
}));

// Mock window dimensions for particles
Object.defineProperty(window, 'innerWidth', { writable: true, value: 1024 });
Object.defineProperty(window, 'innerHeight', { writable: true, value: 768 });

test('renders app without crashing', () => {
  expect(() => {
    render(<App />);
  }).not.toThrow();
});
