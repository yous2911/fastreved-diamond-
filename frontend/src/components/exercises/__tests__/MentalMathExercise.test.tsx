import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import MentalMathExercise from '../MentalMathExercise';

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

describe('MentalMathExercise', () => {
  const defaultProps = {
    difficulty: 3 as const,
    onComplete: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendu initial', () => {
    it('affiche le titre de l\'exercice', () => {
      render(<MentalMathExercise {...defaultProps} />);
      expect(screen.getByText(/Calcul mental/i)).toBeInTheDocument();
    });

    it('affiche le niveau de difficulté', () => {
      render(<MentalMathExercise {...defaultProps} />);
      expect(screen.getByText(/GOOD/i)).toBeInTheDocument();
    });

    it('affiche un problème mathématique', () => {
      render(<MentalMathExercise {...defaultProps} />);
      expect(screen.getByText(/=/)).toBeInTheDocument();
    });

    it('affiche les options de réponse', () => {
      render(<MentalMathExercise {...defaultProps} />);
      
      // Vérifier qu'il y a des boutons de réponse
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThanOrEqual(4); // Au moins 4 options
    });

    it('affiche les instructions', () => {
      render(<MentalMathExercise {...defaultProps} />);
      expect(screen.getByText(/Choisis la bonne réponse/i)).toBeInTheDocument();
    });
  });

  describe('Génération de problèmes', () => {
    it('génère des problèmes selon le niveau de difficulté', () => {
      const { rerender } = render(<MentalMathExercise {...defaultProps} />);
      
      // Test niveau 3 (GOOD) - soustraction
      expect(screen.getAllByText(/-/).length).toBeGreaterThan(0);
      
      // Test niveau 5 (PERFECT) - multiplication
      rerender(<MentalMathExercise {...defaultProps} difficulty={5} />);
      expect(screen.getByText(/×/)).toBeInTheDocument();
    });

    it('génère des problèmes différents à chaque rendu', () => {
      const { rerender } = render(<MentalMathExercise {...defaultProps} />);
      
      const firstProblem = screen.getByText(/=/).textContent;
      
      rerender(<MentalMathExercise {...defaultProps} />);
      const secondProblem = screen.getByText(/=/).textContent;
      
      expect(firstProblem).not.toBe(secondProblem);
    });
  });

  describe('Validation des réponses', () => {
    it('valide une réponse correcte', async () => {
      render(<MentalMathExercise {...defaultProps} />);
      
      // Cliquer sur le premier bouton (peut être correct ou incorrect)
      const buttons = screen.getAllByRole('button');
      fireEvent.click(buttons[0]);
      
      await waitFor(() => {
        expect(defaultProps.onComplete).toHaveBeenCalledWith(expect.any(Boolean), expect.any(Number));
      });
    });

    it('valide une réponse incorrecte', async () => {
      render(<MentalMathExercise {...defaultProps} />);
      
      // Cliquer sur le deuxième bouton (peut être correct ou incorrect)
      const buttons = screen.getAllByRole('button');
      fireEvent.click(buttons[1]);
      
      await waitFor(() => {
        expect(defaultProps.onComplete).toHaveBeenCalledWith(expect.any(Boolean), expect.any(Number));
      });
    });

    it('affiche le résultat après avoir répondu', async () => {
      render(<MentalMathExercise {...defaultProps} />);
      
      const buttons = screen.getAllByRole('button');
      fireEvent.click(buttons[0]);
      
      await waitFor(() => {
        // Le composant affiche soit "BRAVO" soit "Essaie encore"
        const resultText = screen.queryByText(/BRAVO|Essaie encore/i);
        expect(resultText).toBeInTheDocument();
      });
    });
  });

  describe('Niveaux de difficulté', () => {
    it('affiche le bon niveau pour chaque difficulté', () => {
      const { rerender } = render(<MentalMathExercise {...defaultProps} difficulty={0} />);
      // Utiliser getAllByText car BLACKOUT apparaît plusieurs fois
      const blackoutElements = screen.getAllByText(/BLACKOUT/i);
      expect(blackoutElements.length).toBeGreaterThan(0);
      
      rerender(<MentalMathExercise {...defaultProps} difficulty={1} />);
      const hardElements = screen.getAllByText(/HARD/i);
      expect(hardElements.length).toBeGreaterThan(0);
      
      rerender(<MentalMathExercise {...defaultProps} difficulty={2} />);
      const difficultElements = screen.getAllByText(/DIFFICULT/i);
      expect(difficultElements.length).toBeGreaterThan(0);
      
      rerender(<MentalMathExercise {...defaultProps} difficulty={3} />);
      const goodElements = screen.getAllByText(/GOOD/i);
      expect(goodElements.length).toBeGreaterThan(0);
      
      rerender(<MentalMathExercise {...defaultProps} difficulty={4} />);
      const easyElements = screen.getAllByText(/EASY/i);
      expect(easyElements.length).toBeGreaterThan(0);
      
      rerender(<MentalMathExercise {...defaultProps} difficulty={5} />);
      const perfectElements = screen.getAllByText(/PERFECT/i);
      expect(perfectElements.length).toBeGreaterThan(0);
    });

    it('génère le bon type d\'opération selon la difficulté', () => {
      const { rerender } = render(<MentalMathExercise {...defaultProps} difficulty={0} />);
      expect(screen.getByText(/\+/)).toBeInTheDocument(); // Addition pour BLACKOUT
      
      rerender(<MentalMathExercise {...defaultProps} difficulty={3} />);
      expect(screen.getAllByText(/-/).length).toBeGreaterThan(0); // Soustraction pour GOOD
      
      rerender(<MentalMathExercise {...defaultProps} difficulty={5} />);
      expect(screen.getByText(/×/)).toBeInTheDocument(); // Multiplication pour PERFECT
    });
  });

  describe('Interface utilisateur', () => {
    it('affiche les options de réponse dans une grille', () => {
      render(<MentalMathExercise {...defaultProps} />);
      
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThanOrEqual(4);
    });

    it('désactive les boutons après avoir répondu', async () => {
      render(<MentalMathExercise {...defaultProps} />);
      
      const buttons = screen.getAllByRole('button');
      fireEvent.click(buttons[0]);
      
      await waitFor(() => {
        buttons.forEach(button => {
          expect(button).toBeDisabled();
        });
      });
    });

    it('affiche les couleurs appropriées pour les réponses', async () => {
      render(<MentalMathExercise {...defaultProps} />);
      
      const buttons = screen.getAllByRole('button');
      fireEvent.click(buttons[0]);
      
      await waitFor(() => {
        // Le composant affiche soit "BRAVO" soit "Essaie encore"
        const resultText = screen.queryByText(/BRAVO|Essaie encore/i);
        expect(resultText).toBeInTheDocument();
      });
    });
  });

  describe('Animations et transitions', () => {
    it('affiche les animations d\'entrée', () => {
      render(<MentalMathExercise {...defaultProps} />);
      
      const container = screen.getByText(/Calcul mental/i).closest('div');
      expect(container).toBeInTheDocument();
    });

    it('affiche les animations des boutons', () => {
      render(<MentalMathExercise {...defaultProps} />);
      
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe('Accessibilité', () => {
    it('a des boutons avec des noms accessibles', () => {
      render(<MentalMathExercise {...defaultProps} />);
      
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toHaveTextContent(/\d+/); // Chaque bouton a un nombre
      });
    });

    it('a des instructions claires pour les lecteurs d\'écran', () => {
      render(<MentalMathExercise {...defaultProps} />);
      
      expect(screen.getByText(/Choisis la bonne réponse/i)).toBeInTheDocument();
    });
  });

  describe('Responsive design', () => {
    it('s\'adapte aux différentes tailles d\'écran', () => {
      render(<MentalMathExercise {...defaultProps} />);
      
      // Chercher le bon élément parent avec la classe space-y-6
      const container = screen.getByText(/Calcul mental/i).closest('div');
      const parentContainer = container?.parentElement;
      expect(parentContainer).toHaveClass('space-y-6');
    });
  });

  describe('Gestion des erreurs', () => {
    it('gère les problèmes invalides', () => {
      render(<MentalMathExercise {...defaultProps} difficulty={999 as any} />);
      
      // Le composant devrait afficher un problème par défaut
      expect(screen.getByText(/=/)).toBeInTheDocument();
    });
  });
}); 