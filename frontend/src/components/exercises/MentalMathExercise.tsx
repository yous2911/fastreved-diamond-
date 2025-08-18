import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface MentalMathExerciseProps {
  difficulty: 0 | 1 | 2 | 3 | 4 | 5; // SuperMemo quality levels
  onComplete: (isCorrect: boolean, timeSpent: number) => void;
}

const MentalMathExercise: React.FC<MentalMathExerciseProps> = ({
  difficulty,
  onComplete
}) => {
  const [currentProblem, setCurrentProblem] = useState<{
    question: string;
    answer: number;
    options: number[];
  } | null>(null);
  const [userAnswer, setUserAnswer] = useState<number | null>(null);
  const [startTime, setStartTime] = useState<number>(0);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  const generateProblem = () => {
    let question: string;
    let answer: number;
    let options: number[];

    switch (difficulty) {
      case 0: // BLACKOUT - Complete forgetfulness
        const a0 = Math.floor(Math.random() * 5) + 1;
        const b0 = Math.floor(Math.random() * 5) + 1;
        question = `${a0} + ${b0} = ?`;
        answer = a0 + b0;
        options = [answer, answer + 1, answer - 1, answer + 2].sort(() => Math.random() - 0.5);
        break;

      case 1: // HARD - Incorrect but remembered something
        const a1 = Math.floor(Math.random() * 8) + 1;
        const b1 = Math.floor(Math.random() * 8) + 1;
        question = `${a1} + ${b1} = ?`;
        answer = a1 + b1;
        options = [answer, answer + 1, answer - 1, answer + 2].sort(() => Math.random() - 0.5);
        break;

      case 2: // DIFFICULT - Incorrect with effort
        const a2 = Math.floor(Math.random() * 10) + 1;
        const b2 = Math.floor(Math.random() * 10) + 1;
        question = `${a2} + ${b2} = ?`;
        answer = a2 + b2;
        options = [answer, answer + 1, answer - 1, answer + 2].sort(() => Math.random() - 0.5);
        break;

      case 3: // GOOD - Correct with difficulty
        const a3 = Math.floor(Math.random() * 15) + 1;
        const b3 = Math.floor(Math.random() * 15) + 1;
        question = `${a3} - ${b3} = ?`;
        answer = a3 - b3;
        options = [answer, answer + 1, answer - 1, answer + 2].sort(() => Math.random() - 0.5);
        break;

      case 4: // EASY - Correct with hesitation
        const a4 = Math.floor(Math.random() * 20) + 1;
        const b4 = Math.floor(Math.random() * 20) + 1;
        question = `${a4} - ${b4} = ?`;
        answer = a4 - b4;
        options = [answer, answer + 1, answer - 1, answer + 2].sort(() => Math.random() - 0.5);
        break;

      case 5: // PERFECT - Perfect response
        const a5 = Math.floor(Math.random() * 12) + 1;
        const b5 = Math.floor(Math.random() * 12) + 1;
        question = `${a5} × ${b5} = ?`;
        answer = a5 * b5;
        options = [answer, answer + a5, answer - b5, answer + 1].sort(() => Math.random() - 0.5);
        break;

      default:
        question = '1 + 1 = ?';
        answer = 2;
        options = [2, 3, 1, 4];
    }

    setCurrentProblem({ question, answer, options });
    setUserAnswer(null);
    setShowResult(false);
    setStartTime(Date.now());
  };

  useEffect(() => {
    generateProblem();
  }, [difficulty]);

  const handleAnswerSelect = (selectedAnswer: number) => {
    setUserAnswer(selectedAnswer);
    const timeSpent = (Date.now() - startTime) / 1000;
    const correct = selectedAnswer === currentProblem?.answer;
    
    setIsCorrect(correct);
    setShowResult(true);

    setTimeout(() => {
      onComplete(correct, timeSpent);
      generateProblem();
    }, 2000);
  };

  if (!currentProblem) return null;

  return (
    <div className="space-y-6">
      <motion.div
        className="text-center"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h3 className="text-3xl font-bold text-gray-800 mb-4">
          Calcul Mental
        </h3>
        <div className="text-sm text-gray-600 mb-6">
          Niveau: {difficulty === 0 ? 'BLACKOUT' : difficulty === 1 ? 'HARD' : difficulty === 2 ? 'DIFFICULT' : difficulty === 3 ? 'GOOD' : difficulty === 4 ? 'EASY' : 'PERFECT'}
          <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
            SuperMemo: {difficulty === 0 ? 'BLACKOUT' : difficulty === 1 ? 'HARD' : difficulty === 2 ? 'DIFFICULT' : difficulty === 3 ? 'GOOD' : difficulty === 4 ? 'EASY' : 'PERFECT'}
          </span>
        </div>
      </motion.div>

      {/* Question */}
      <motion.div
        className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-8 rounded-2xl shadow-xl text-center"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <div className="text-6xl font-bold mb-4">
          {currentProblem.question}
        </div>
        <div className="text-2xl opacity-90">
          Choisis la bonne réponse !
        </div>
      </motion.div>

      {/* Options */}
      <div className="grid grid-cols-2 gap-4">
        <AnimatePresence>
          {currentProblem.options.map((option, index) => (
            <motion.button
              key={option}
              onClick={() => handleAnswerSelect(option)}
              disabled={showResult}
              className={`
                p-6 rounded-xl text-2xl font-bold shadow-lg transition-all duration-300
                ${showResult
                  ? option === currentProblem.answer
                    ? 'bg-green-500 text-white scale-110'
                    : option === userAnswer && option !== currentProblem.answer
                    ? 'bg-red-500 text-white scale-95'
                    : 'bg-gray-300 text-gray-600'
                  : 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white hover:scale-105 active:scale-95'
                }
              `}
              whileHover={!showResult ? { scale: 1.05 } : {}}
              whileTap={!showResult ? { scale: 0.95 } : {}}
              initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + index * 0.1 }}
            >
              {option}
            </motion.button>
          ))}
        </AnimatePresence>
      </div>

      {/* Résultat */}
      <AnimatePresence>
        {showResult && (
          <motion.div
            className="text-center"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
          >
            <div className={`text-4xl mb-4 ${isCorrect ? 'text-green-500' : 'text-red-500'}`}>
              {isCorrect ? '🎉 BRAVO !' : '❌ Essaie encore !'}
            </div>
            <div className="text-lg text-gray-600">
              {isCorrect 
                ? `Temps: ${((Date.now() - startTime) / 1000).toFixed(1)}s`
                : `La bonne réponse était: ${currentProblem.answer}`
              }
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MentalMathExercise; 