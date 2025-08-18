import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import DragDropExercise from '../DragDropExercise';

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

describe('DragDropExercise', () => {
  const defaultProps = {
    question: 'Classe les nombres par ordre croissant',
    items: [
      { id: '1', content: '5', category: 'GOOD' },
      { id: '2', content: '3', category: 'GOOD' },
      { id: '3', content: '8', category: 'GOOD' },
      { id: '4', content: '1', category: 'GOOD' },
    ],
    zones: [
      { id: 'zone1', label: 'Premier', accepts: ['GOOD'], items: [] },
      { id: 'zone2', label: 'Deuxième', accepts: ['GOOD'], items: [] },
      { id: 'zone3', label: 'Troisième', accepts: ['GOOD'], items: [] },
      { id: 'zone4', label: 'Quatrième', accepts: ['GOOD'], items: [] },
    ],
    onComplete: jest.fn(),
  };

  it('se rend sans erreur', () => {
    expect(() => {
      render(<DragDropExercise {...defaultProps} />);
    }).not.toThrow();
  });

  it('affiche la question', () => {
    render(<DragDropExercise {...defaultProps} />);
    expect(screen.getByText(/Classe les nombres/i)).toBeInTheDocument();
  });

  it('affiche les éléments à glisser', () => {
    render(<DragDropExercise {...defaultProps} />);
    
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('affiche les zones de dépôt', () => {
    render(<DragDropExercise {...defaultProps} />);
    
    expect(screen.getByText('Premier')).toBeInTheDocument();
    expect(screen.getByText('Deuxième')).toBeInTheDocument();
    expect(screen.getByText('Troisième')).toBeInTheDocument();
    expect(screen.getByText('Quatrième')).toBeInTheDocument();
  });

  it('accepte différentes questions', () => {
    const { rerender } = render(<DragDropExercise {...defaultProps} />);
    
    rerender(<DragDropExercise {...defaultProps} question="Nouvelle question" />);
    expect(screen.getByText(/Nouvelle question/i)).toBeInTheDocument();
  });

  it('accepte différents éléments', () => {
    const newItems = [
      { id: '1', content: 'A', category: 'GOOD' },
      { id: '2', content: 'B', category: 'GOOD' },
    ];
    const newZones = [
      { id: 'zone1', label: 'First', accepts: ['GOOD'], items: [] },
      { id: 'zone2', label: 'Second', accepts: ['GOOD'], items: [] },
    ];
    
    render(<DragDropExercise {...defaultProps} items={newItems} zones={newZones} />);
    
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
    expect(screen.getByText('First')).toBeInTheDocument();
    expect(screen.getByText('Second')).toBeInTheDocument();
  });
}); 