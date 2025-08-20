// Unified Educational Demo Component for CP, CE1, CE2
// ===================================================

import React, { useState, useMemo } from 'react';
import { useEducationalData } from '../hooks/useEducationalData';
import { EducationalService } from '../services/educational.service';
import {
  EducationalLevel,
  EducationalModule,
  EducationalExercise,
  EducationalCompetence,
  ExerciseType,
  Difficulty,
  Subject
} from '../types/educational.types';

// Sample CP2025 data from the main project (simplified example)
const sampleCP2025Data = {
  modules: [
    {
      id: 1,
      titre: "Français CP - Lecture Période 1 & 2",
      description: "Apprentissage des correspondances graphème-phonème, assemblage de syllabes et compréhension de phrases simples.",
      niveau: "CP" as EducationalLevel,
      matiere: "FRANCAIS" as Subject,
      periode: "P1-P2",
      ordre: 1,
      metadata: {
        competenceDomain: "CP.FR.L1",
        cp2025: true
      }
    },
    {
      id: 2,
      titre: "Mathématiques CP - Nombres et Calculs Période 1 & 2",
      description: "Construction des nombres, décomposition, calcul mental et résolution de problèmes simples.",
      niveau: "CP" as EducationalLevel,
      matiere: "MATHEMATIQUES" as Subject,
      periode: "P1-P2",
      ordre: 2,
      metadata: {
        competenceDomain: "CP.MA.N1",
        cp2025: true
      }
    }
  ],
  exercises: [
    {
      titre: "Reconnaissance du son [o]",
      consigne: "Clique sur l'image qui contient le son [o]",
      type: "QCM" as ExerciseType,
      difficulte: "decouverte" as Difficulty,
      moduleId: 1,
      configuration: {
        question: "Où entends-tu le son [o] ?",
        choix: ["moto", "papa", "mama", "nana"],
        bonneReponse: "moto",
        audioRequired: true
      },
      metadata: {
        competenceCode: "CP.FR.L1.1",
        cognitiveLoad: "low",
        engagement: "high"
      }
    },
    {
      titre: "Addition simple",
      consigne: "Calcule le résultat de l'addition",
      type: "CALCUL" as ExerciseType,
      difficulte: "entrainement" as Difficulty,
      moduleId: 2,
      configuration: {
        operation: "3 + 2",
        resultat: 5,
        type_calcul: "addition"
      },
      metadata: {
        competenceCode: "CP.MA.C1.1",
        cognitiveLoad: "medium",
        engagement: "medium"
      }
    }
  ],
  competences: {
    "CP.FR.L1.1": {
      titre: "Maîtriser les 15 CGP de la Période 1",
      description: "Correspondances Graphème-Phonème de base (voyelles + consonnes)",
      periode: "P1",
      domaine: "LECTURE",
      seuil_maitrise: 90,
      prerequis: [],
      objectifs: ["Reconnaître voyelles a,e,i,o,u", "Identifier consonnes m,n,p,t,r,l,s"],
      exemples: ["papa", "mama", "moto", "nana"]
    },
    "CP.MA.C1.1": {
      titre: "Décomposer les nombres jusqu'à 10",
      description: "Comprendre la composition des nombres par addition",
      periode: "P1",
      domaine: "CALCUL",
      seuil_maitrise: 85,
      prerequis: [],
      objectifs: ["Décomposer 5 en 3+2", "Comprendre l'addition"],
      exemples: ["3+2=5", "4+1=5"]
    }
  }
};

// Level Selector Component
interface LevelSelectorProps {
  selectedLevel: EducationalLevel;
  onLevelChange: (level: EducationalLevel) => void;
}

const LevelSelector: React.FC<LevelSelectorProps> = ({ selectedLevel, onLevelChange }: LevelSelectorProps) => {
  const levels: EducationalLevel[] = ['CP', 'CE1', 'CE2'];
  
  return (
    <div className="mb-6">
      <h3 className="text-lg font-semibold mb-3">Sélectionner le niveau :</h3>
      <div className="flex gap-2">
        {levels.map((level) => (
          <button
            key={level}
            onClick={() => onLevelChange(level)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedLevel === level
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {level}
          </button>
        ))}
      </div>
    </div>
  );
};

// Statistics Display Component
interface StatisticsDisplayProps {
  statistics: any;
}

const StatisticsDisplay: React.FC<StatisticsDisplayProps> = ({ statistics }: StatisticsDisplayProps) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h3 className="text-lg font-semibold mb-4">📊 Statistiques</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{statistics.totalModules}</div>
          <div className="text-sm text-gray-600">Modules</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{statistics.totalExercises}</div>
          <div className="text-sm text-gray-600">Exercices</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600">
            {statistics.competencesByLevel.CP + statistics.competencesByLevel.CE1 + statistics.competencesByLevel.CE2}
          </div>
          <div className="text-sm text-gray-600">Compétences</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-600">
            {statistics.exercisesByType.QCM + statistics.exercisesByType.CALCUL + statistics.exercisesByType.DRAG_DROP}
          </div>
          <div className="text-sm text-gray-600">Types d'exercices</div>
        </div>
      </div>
    </div>
  );
};

// Competence Display Component
interface CompetenceDisplayProps {
  competences: EducationalCompetence[];
  level: EducationalLevel;
}

const CompetenceDisplay: React.FC<CompetenceDisplayProps> = ({ competences, level }: CompetenceDisplayProps) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h3 className="text-lg font-semibold mb-4">🎯 Compétences {level}</h3>
      <div className="space-y-4">
        {competences.map((competence: EducationalCompetence) => (
          <div key={competence.code} className="border-l-4 border-blue-500 pl-4">
            <div className="font-medium text-blue-600">{competence.code}</div>
            <div className="font-semibold">{competence.titre}</div>
            <div className="text-gray-600 text-sm">{competence.description}</div>
            {competence.prerequis.length > 0 && (
              <div className="text-xs text-gray-500 mt-1">
                Prérequis: {competence.prerequis.join(', ')}
              </div>
            )}
            {competence.saut_qualitatif && (
              <div className="text-xs text-orange-600 mt-1">
                Saut qualitatif: {competence.saut_qualitatif}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// Exercise Demo Component
interface ExerciseDemoProps {
  exercises: EducationalExercise[];
  level: EducationalLevel;
}

const ExerciseDemo: React.FC<ExerciseDemoProps> = ({ exercises, level }: ExerciseDemoProps) => {
  const [selectedExercise, setSelectedExercise] = useState<EducationalExercise | null>(null);
  const [userAnswer, setUserAnswer] = useState<string>('');
  const [showFeedback, setShowFeedback] = useState<boolean>(false);
  const [isCorrect, setIsCorrect] = useState<boolean>(false);

  const handleExerciseSelect = (exercise: EducationalExercise) => {
    setSelectedExercise(exercise);
    setUserAnswer('');
    setShowFeedback(false);
  };

  const handleSubmit = () => {
    if (!selectedExercise) return;
    
    let correct = false;
    if (selectedExercise.type === 'QCM' && 'bonneReponse' in selectedExercise.configuration) {
      correct = userAnswer === (selectedExercise.configuration as any).bonneReponse;
    } else if (selectedExercise.type === 'CALCUL' && 'resultat' in selectedExercise.configuration) {
      correct = userAnswer === String((selectedExercise.configuration as any).resultat);
    }
    
    setIsCorrect(correct);
    setShowFeedback(true);
  };

  const getExerciseTypeIcon = (type: ExerciseType) => {
    const icons: Record<ExerciseType, string> = {
      QCM: '📝',
      CALCUL: '🧮',
      DRAG_DROP: '🖱️',
      TEXT_INPUT: '⌨️',
      LECTURE: '📖',
      GEOMETRIE: '📐',
      PROBLEME: '🤔',
      CONJUGAISON: '📚',
      VOCABULAIRE: '📖'
    };
    return icons[type] || '❓';
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h3 className="text-lg font-semibold mb-4">🎮 Exercices {level}</h3>
      
      {/* Exercise List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {exercises.map((exercise: EducationalExercise) => (
          <div
            key={exercise.titre}
            onClick={() => handleExerciseSelect(exercise)}
            className={`p-4 border rounded-lg cursor-pointer transition-colors ${
              selectedExercise?.titre === exercise.titre
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">{getExerciseTypeIcon(exercise.type)}</span>
              <span className="font-medium">{exercise.titre}</span>
            </div>
            <div className="text-sm text-gray-600">{exercise.consigne}</div>
            <div className="flex gap-2 mt-2">
              <span className={`px-2 py-1 rounded text-xs ${
                exercise.difficulte === 'decouverte' ? 'bg-green-100 text-green-800' :
                exercise.difficulte === 'entrainement' ? 'bg-yellow-100 text-yellow-800' :
                exercise.difficulte === 'consolidation' ? 'bg-blue-100 text-blue-800' :
                'bg-purple-100 text-purple-800'
              }`}>
                {exercise.difficulte}
              </span>
              <span className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-800">
                {exercise.type}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Selected Exercise */}
      {selectedExercise && (
        <div className="border-t pt-6">
          <h4 className="font-semibold mb-4">{selectedExercise.titre}</h4>
          <div className="mb-4">
            <p className="text-gray-700 mb-4">{selectedExercise.consigne}</p>
            
            {selectedExercise.type === 'QCM' && (
              <div className="space-y-2">
                <p className="font-medium">{(selectedExercise.configuration as any).question}</p>
                <div className="space-y-2">
                  {(selectedExercise.configuration as any).choix.map((choice: string) => (
                    <label key={choice} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="answer"
                        value={choice}
                        checked={userAnswer === choice}
                        onChange={(e: any) => setUserAnswer(e.target.value)}
                        className="text-blue-600"
                      />
                      <span>{choice}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {selectedExercise.type === 'CALCUL' && (
              <div>
                <p className="font-medium mb-2">{(selectedExercise.configuration as any).operation}</p>
                <input
                  type="text"
                  value={userAnswer}
                  onChange={(e: any) => setUserAnswer(e.target.value)}
                  className="w-full p-2 border rounded-lg"
                  placeholder="Tapez votre réponse..."
                />
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSubmit}
              disabled={!userAnswer}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Valider
            </button>
            <button
              onClick={() => {
                setSelectedExercise(null);
                setUserAnswer('');
                setShowFeedback(false);
              }}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg"
            >
              Fermer
            </button>
          </div>

          {showFeedback && (
            <div className={`mt-4 p-4 rounded-lg ${
              isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              <div className="font-medium">
                {isCorrect ? '✅ Correct !' : '❌ Incorrect'}
              </div>
              <div className="text-sm mt-1">
                {isCorrect 
                  ? selectedExercise.configuration.feedback?.correct 
                  : selectedExercise.configuration.feedback?.incorrect
                }
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Main Educational Demo Component
const EducationalDemo: React.FC = () => {
  const [selectedLevel, setSelectedLevel] = useState<EducationalLevel>('CP');
  
  // Integrate CP2025 data into unified format
  const integratedData = EducationalService.integrateCP2025Data(sampleCP2025Data);
  
  // Use the educational data hook with integrated data
  const educationalData = useEducationalData({
    initialData: integratedData
  });

  const { modules, exercises, competences, getStatistics, loading, error } = educationalData;

  const statistics = useMemo(() => getStatistics(), [getStatistics]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des données éducatives...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold mb-2">Erreur de chargement</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            🎓 Système Éducatif Unifié
          </h1>
          <p className="text-xl text-gray-600">
            Démonstration interactive pour CP, CE1 et CE2
          </p>
        </div>

        {/* Level Selector */}
        <LevelSelector
          selectedLevel={selectedLevel}
          onLevelChange={setSelectedLevel}
        />

        {/* Statistics */}
        <StatisticsDisplay statistics={statistics} />

        {/* Content for Selected Level */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Competences */}
          <CompetenceDisplay
            competences={competences[selectedLevel]}
            level={selectedLevel}
          />

          {/* Exercises */}
          <ExerciseDemo
            exercises={exercises[selectedLevel]}
            level={selectedLevel}
          />
        </div>

        {/* Level Progression Info */}
        <div className="bg-white rounded-lg shadow-md p-6 mt-6">
          <h3 className="text-lg font-semibold mb-4">🔄 Progression des Niveaux</h3>
          <div className="flex items-center justify-center gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">CP</div>
              <div className="text-sm text-gray-600">Fondations</div>
            </div>
            <div className="text-2xl text-gray-400">→</div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">CE1</div>
              <div className="text-sm text-gray-600">Développement</div>
            </div>
            <div className="text-2xl text-gray-400">→</div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">CE2</div>
              <div className="text-sm text-gray-600">Maîtrise</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EducationalDemo;
