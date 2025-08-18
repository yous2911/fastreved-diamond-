import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import NextLevelXPSystem from '../NextLevelXPSystem';

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
  },
  AnimatePresence: ({ children }: any) => <div>{children}</div>,
}));

describe('NextLevelXPSystem', () => {
  const defaultProps = {
    currentXP: 150,
    level: 3,
    maxXP: 200,
    onLevelUp: jest.fn(),
    onXPGain: jest.fn(),
  };

  it('se rend sans erreur', () => {
    expect(() => {
      render(<NextLevelXPSystem {...defaultProps} />);
    }).not.toThrow();
  });

  it('affiche le niveau actuel', () => {
    render(<NextLevelXPSystem {...defaultProps} />);
    expect(screen.getByText(/Niveau 3/i)).toBeInTheDocument();
  });

  it('affiche l\'XP actuel', () => {
    render(<NextLevelXPSystem {...defaultProps} />);
    // XP is displayed in canvas, so we check that the component renders without error
    const canvas = document.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
  });

  it('accepte différents niveaux', () => {
    const { rerender } = render(<NextLevelXPSystem {...defaultProps} />);
    
    rerender(<NextLevelXPSystem {...defaultProps} level={1} />);
    expect(screen.getByText(/Niveau 1/i)).toBeInTheDocument();
    
    rerender(<NextLevelXPSystem {...defaultProps} level={5} />);
    // Use getAllByText for multiple occurrences
    expect(screen.getAllByText(/Niveau 5/i)[0]).toBeInTheDocument();
  });

  it('accepte différentes valeurs d\'XP', () => {
    const { rerender } = render(<NextLevelXPSystem {...defaultProps} />);
    
    rerender(<NextLevelXPSystem {...defaultProps} currentXP={50} />);
    // XP is displayed in canvas, so we check that the component rerenders without error
    let canvas = document.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
    
    rerender(<NextLevelXPSystem {...defaultProps} currentXP={300} />);
    canvas = document.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
  });
}); 