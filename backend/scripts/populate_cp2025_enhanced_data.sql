-- CP2025 Enhanced Data Population Script
-- Sample data for student progress tracking, prerequisites, and analytics

-- =============================================================================
-- COMPETENCE PREREQUISITES DATA
-- =============================================================================

-- Insert prerequisite relationships for CP French competences
INSERT INTO competence_prerequisites (competence_code, prerequisite_code, prerequisite_type, mastery_threshold, weight, description) VALUES

-- French prerequisites (reading progression)
('CP.FR.L1.3', 'CP.FR.L1.1', 'required', 75, 2.0, 'Sons simples requis avant sons complexes'),
('CP.FR.L1.4', 'CP.FR.L1.3', 'required', 80, 2.5, 'Sons complexes requis pour graphèmes complexes'),
('CP.FR.L1.5', 'CP.FR.L1.4', 'required', 85, 3.0, 'Graphèmes complexes de base requis pour niveau avancé'),
('CP.FR.L2.1', 'CP.FR.L1.1', 'required', 70, 1.5, 'Reconnaissance phonèmes nécessaire pour syllabation'),
('CP.FR.L2.3', 'CP.FR.L2.1', 'required', 80, 2.0, 'Construction syllabique requise pour syllabation avancée'),
('CP.FR.L3.3', 'CP.FR.L2.3', 'required', 85, 2.5, 'Syllabation maîtrisée pour lecture fluente'),
('CP.FR.L3.4', 'CP.FR.L3.3', 'recommended', 75, 1.8, 'Lecture fluente aide à comprendre la ponctuation'),

-- French grammar prerequisites
('CP.FR.G1.3', 'CP.FR.G1.1', 'required', 80, 2.0, 'Catégories grammaticales requises pour accords'),
('CP.FR.G1.4', 'CP.FR.G1.3', 'required', 85, 2.5, 'Accords de base requis pour niveau avancé'),

-- French comprehension prerequisites
('CP.FR.C2.4', 'CP.FR.C1.4', 'recommended', 70, 1.5, 'Connecteurs logiques aident à l\'implicite'),

-- French writing prerequisites
('CP.FR.E2.2', 'CP.FR.E1.6', 'required', 75, 2.0, 'Copie et orthographe de base pour homophones'),
('CP.FR.E3.2', 'CP.FR.E1.6', 'required', 80, 2.2, 'Orthographe requise pour production écrite'),
('CP.FR.E3.3', 'CP.FR.L3.4', 'recommended', 75, 1.8, 'Compréhension ponctuation aide à l\'écriture');

-- Insert prerequisite relationships for CP Math competences
INSERT INTO competence_prerequisites (competence_code, prerequisite_code, prerequisite_type, mastery_threshold, weight, description) VALUES

-- Math number prerequisites
('CP.MA.N1.4', 'CP.MA.N1.1', 'required', 85, 3.0, 'Dénombrement requis pour nombres jusqu\'à 100'),
('CP.MA.N1.5', 'CP.MA.N1.4', 'required', 80, 2.5, 'Nombres jusqu\'à 100 requis pour suite numérique'),
('CP.MA.N2.3', 'CP.MA.N1.4', 'required', 75, 2.0, 'Nombres jusqu\'à 100 requis pour décomposition'),
('CP.MA.N3.1', 'CP.MA.N2.3', 'recommended', 70, 1.5, 'Décomposition aide au calcul mental'),

-- Math operation prerequisites
('CP.MA.N4.3', 'CP.MA.N4.2', 'recommended', 70, 1.8, 'Problèmes de recherche aident au sens multiplication'),
('CP.MA.N4.4', 'CP.MA.N4.3', 'recommended', 75, 2.0, 'Multiplication aide à comprendre division'),

-- Math problem-solving prerequisites
('CP.MA.P1.2', 'CP.MA.N3.1', 'required', 80, 2.5, 'Calcul mental requis pour problèmes à étapes'),
('CP.MA.P2.1', 'CP.MA.N4.3', 'required', 85, 3.0, 'Sens multiplication requis pour problèmes'),
('CP.MA.P2.2', 'CP.MA.P2.1', 'recommended', 75, 1.8, 'Problèmes multiplication aident arrangements'),
('CP.MA.P3.2', 'CP.MA.P1.2', 'recommended', 70, 1.5, 'Problèmes étapes développent stratégies'),

-- Math measurement prerequisites  
('CP.MA.M2.1', 'CP.MA.M1.4', 'recommended', 70, 1.5, 'Estimation longueur aide comparaison masses'),
('CP.MA.M4.4', 'CP.MA.M4.3', 'required', 80, 2.0, 'Monnaie de base requis pour problèmes'),

-- Math geometry prerequisites
('CP.MA.G2.3', 'CP.MA.G2.1', 'required', 75, 2.0, 'Logique spatiale requis pour reproduction figures'),

-- Math data prerequisites
('CP.MA.D1.4', 'CP.MA.D1.3', 'required', 80, 2.2, 'Lecture diagrammes requis pour comparaison');

-- Insert CE1 prerequisites (transition competences)
INSERT INTO competence_prerequisites (competence_code, prerequisite_code, prerequisite_type, mastery_threshold, weight, description) VALUES

-- CE1 French prerequisites
('FR.CE1.G1.2', 'FR.CE1.G1.1', 'required', 80, 2.5, 'Catégories grammaticales requises pour identification sujet'),
('FR.CE1.G2.1', 'FR.CE1.G1.1', 'required', 75, 2.0, 'Catégories grammaticales de base pour conjugaison'),
('FR.CE1.G2.2', 'FR.CE1.G2.1', 'required', 85, 3.0, 'ÊTRE/AVOIR requis avant verbes en -er'),
('FR.CE1.E2.3', 'CP.FR.E2.2', 'required', 80, 2.5, 'Homophones CP requis pour homophones grammaticaux'),
('FR.CE1.E3.2', 'CP.FR.E3.2', 'required', 75, 2.0, 'Production écrite CP requise pour niveau guidé'),

-- CE1 Math prerequisites
('MA.CE1.N3.1', 'MA.CE1.N1.1', 'required', 85, 3.0, 'Nombres jusqu\'à 1000 requis pour opérations posées'),
('MA.CE1.N3.2', 'CP.MA.N4.3', 'required', 80, 2.5, 'Sens multiplication CP requis pour tables'),
('MA.CE1.P2.1', 'MA.CE1.N3.2', 'required', 85, 3.0, 'Tables multiplication requises pour problèmes'),
('MA.CE1.P3.1', 'MA.CE1.P2.1', 'required', 80, 2.8, 'Problèmes multiplication requis pour étapes multiples'),
('MA.CE1.P3.3', 'MA.CE1.P3.1', 'recommended', 75, 2.0, 'Problèmes multiples aident questions cachées');

-- =============================================================================
-- SAMPLE STUDENT PROGRESS DATA
-- =============================================================================

-- Note: This assumes students table exists with IDs 1, 2, 3, etc.
-- Insert sample student competence progress (for student ID 1)
INSERT INTO student_competence_progress (
    student_id, competence_code, niveau, matiere, domaine,
    mastery_level, progress_percent, total_attempts, successful_attempts, average_score,
    total_time_spent, difficulty_level, consecutive_successes,
    first_attempt_at, last_attempt_at, created_at, updated_at
) VALUES
-- Student 1 - CP French progress
(1, 'CP.FR.L1.1', 'CP', 'FRANCAIS', 'L1', 'mastered', 100, 15, 13, 87.50, 1200, 1.0, 5, '2024-01-15 10:00:00', '2024-01-20 14:30:00', NOW(), NOW()),
(1, 'CP.FR.L1.3', 'CP', 'FRANCAIS', 'L1', 'mastering', 85, 12, 10, 83.33, 980, 1.2, 3, '2024-01-21 09:15:00', '2024-01-25 11:45:00', NOW(), NOW()),
(1, 'CP.FR.L1.4', 'CP', 'FRANCAIS', 'L1', 'practicing', 65, 8, 5, 62.50, 720, 1.4, 1, '2024-01-26 10:30:00', '2024-01-30 16:20:00', NOW(), NOW()),

-- Student 1 - CP Math progress  
(1, 'CP.MA.N1.1', 'CP', 'MATHEMATIQUES', 'N1', 'mastered', 100, 18, 16, 88.89, 1400, 0.8, 6, '2024-01-10 08:45:00', '2024-01-18 15:10:00', NOW(), NOW()),
(1, 'CP.MA.N1.4', 'CP', 'MATHEMATIQUES', 'N1', 'mastering', 90, 14, 12, 85.71, 1150, 1.1, 4, '2024-01-19 09:30:00', '2024-01-28 13:20:00', NOW(), NOW()),
(1, 'CP.MA.N2.3', 'CP', 'MATHEMATIQUES', 'N2', 'practicing', 70, 10, 7, 70.00, 850, 1.3, 2, '2024-01-25 11:00:00', '2024-02-01 10:15:00', NOW(), NOW()),

-- Student 2 - Different progress pattern
(2, 'CP.FR.L1.1', 'CP', 'FRANCAIS', 'L1', 'practicing', 75, 10, 7, 70.00, 950, 1.5, 2, '2024-01-20 14:00:00', '2024-01-28 16:30:00', NOW(), NOW()),
(2, 'CP.MA.N1.1', 'CP', 'MATHEMATIQUES', 'N1', 'mastered', 100, 20, 18, 90.00, 1600, 0.9, 7, '2024-01-12 09:00:00', '2024-01-22 14:45:00', NOW(), NOW()),
(2, 'CP.MA.N1.4', 'CP', 'MATHEMATIQUES', 'N1', 'practicing', 60, 8, 4, 50.00, 680, 1.6, 0, '2024-01-23 10:20:00', '2024-01-31 12:10:00', NOW(), NOW());

-- Insert sample learning paths
INSERT INTO student_learning_path (
    student_id, competence_code, status, priority, recommended_difficulty,
    estimated_completion_time, personalized_order, is_blocked, unlocked_at,
    created_at, updated_at
) VALUES
-- Student 1 learning path
(1, 'CP.FR.L1.1', 'completed', 'normal', 'consolidation', 45, 1, FALSE, '2024-01-15 10:00:00', NOW(), NOW()),
(1, 'CP.FR.L1.3', 'in_progress', 'high', 'entrainement', 60, 2, FALSE, '2024-01-20 14:30:00', NOW(), NOW()),
(1, 'CP.FR.L1.4', 'available', 'normal', 'decouverte', 75, 3, FALSE, '2024-01-21 09:15:00', NOW(), NOW()),
(1, 'CP.FR.L1.5', 'locked', 'normal', 'decouverte', 90, 4, TRUE, NULL, NOW(), NOW()),

-- Math path for student 1
(1, 'CP.MA.N1.1', 'completed', 'normal', 'consolidation', 40, 1, FALSE, '2024-01-10 08:45:00', NOW(), NOW()),
(1, 'CP.MA.N1.4', 'in_progress', 'high', 'entrainement', 55, 2, FALSE, '2024-01-18 15:10:00', NOW(), NOW()),
(1, 'CP.MA.N1.5', 'available', 'normal', 'decouverte', 65, 3, FALSE, '2024-01-28 13:20:00', NOW(), NOW()),

-- Student 2 learning path
(2, 'CP.FR.L1.1', 'in_progress', 'high', 'entrainement', 50, 1, FALSE, '2024-01-20 14:00:00', NOW(), NOW()),
(2, 'CP.FR.L1.3', 'locked', 'normal', 'decouverte', 60, 2, TRUE, NULL, NOW(), NOW()),
(2, 'CP.MA.N1.1', 'completed', 'normal', 'consolidation', 40, 1, FALSE, '2024-01-12 09:00:00', NOW(), NOW()),
(2, 'CP.MA.N1.4', 'in_progress', 'urgent', 'entrainement', 70, 2, FALSE, '2024-01-22 14:45:00', NOW(), NOW());

-- =============================================================================
-- SAMPLE ANALYTICS DATA
-- =============================================================================

-- Insert sample daily analytics (last 2 weeks for student 1)
INSERT INTO daily_learning_analytics (
    student_id, analytics_date, total_session_time, exercises_attempted, exercises_completed,
    average_score, francais_time, mathematiques_time, competences_mastered, competences_progressed,
    streak_days, xp_earned, created_at
) VALUES
(1, '2024-01-15', 1200, 8, 6, 85.00, 720, 480, 1, 0, 1, 120, NOW()),
(1, '2024-01-16', 980, 6, 5, 78.50, 580, 400, 0, 1, 2, 95, NOW()),
(1, '2024-01-17', 1450, 10, 8, 82.75, 850, 600, 0, 1, 3, 145, NOW()),
(1, '2024-01-18', 1100, 7, 6, 88.20, 600, 500, 1, 0, 4, 110, NOW()),
(1, '2024-01-19', 890, 5, 4, 72.30, 450, 440, 0, 1, 5, 85, NOW()),
(1, '2024-01-20', 1320, 9, 7, 79.80, 780, 540, 0, 1, 6, 130, NOW()),
(1, '2024-01-21', 0, 0, 0, 0.00, 0, 0, 0, 0, 0, 0, NOW()), -- Weekend break
(1, '2024-01-22', 1180, 8, 6, 84.50, 700, 480, 0, 1, 1, 115, NOW()), -- Streak reset
(1, '2024-01-23', 1050, 6, 5, 81.00, 630, 420, 0, 0, 2, 100, NOW()),
(1, '2024-01-24', 1380, 9, 8, 87.30, 820, 560, 0, 2, 3, 140, NOW()),
(1, '2024-01-25', 920, 5, 4, 75.60, 520, 400, 0, 1, 4, 90, NOW()),
(1, '2024-01-26', 1240, 8, 7, 83.40, 740, 500, 0, 1, 5, 125, NOW()),
(1, '2024-01-27', 1160, 7, 6, 79.90, 680, 480, 0, 1, 6, 115, NOW()),
(1, '2024-01-28', 0, 0, 0, 0.00, 0, 0, 0, 0, 0, 0, NOW()); -- Weekend

-- Insert sample daily analytics for student 2
INSERT INTO daily_learning_analytics (
    student_id, analytics_date, total_session_time, exercises_attempted, exercises_completed,
    average_score, francais_time, mathematiques_time, competences_mastered, competences_progressed,
    streak_days, xp_earned, created_at
) VALUES
(2, '2024-01-20', 950, 6, 4, 70.00, 570, 380, 0, 1, 1, 85, NOW()),
(2, '2024-01-21', 0, 0, 0, 0.00, 0, 0, 0, 0, 0, 0, NOW()), -- Weekend
(2, '2024-01-22', 1600, 12, 10, 90.00, 400, 1200, 1, 0, 1, 180, NOW()),
(2, '2024-01-23', 1200, 8, 6, 75.00, 720, 480, 0, 1, 2, 120, NOW()),
(2, '2024-01-24', 880, 5, 3, 60.00, 530, 350, 0, 0, 3, 70, NOW()),
(2, '2024-01-25', 1100, 7, 5, 68.50, 660, 440, 0, 1, 4, 95, NOW());

-- Insert sample weekly summaries
INSERT INTO weekly_progress_summary (
    student_id, week_start_date, week_end_date, week_of_year, year_number,
    total_learning_time, total_exercises, total_xp_earned,
    competences_mastered, average_score, improvement_rate,
    francais_progress, mathematiques_progress, weekly_goal_met, achievements_unlocked,
    created_at
) VALUES
-- Week 3 of 2024 for student 1 (Jan 15-21)
(1, '2024-01-15', '2024-01-21', 3, 2024, 6940, 45, 685, 2, 81.09, 0.00, 15.5, 12.8, TRUE, 2, NOW()),
-- Week 4 of 2024 for student 1 (Jan 22-28) 
(1, '2024-01-22', '2024-01-28', 4, 2024, 6930, 43, 685, 0, 82.19, 1.36, 8.2, 10.5, TRUE, 1, NOW()),

-- Week 3-4 for student 2
(2, '2024-01-15', '2024-01-21', 3, 2024, 950, 6, 85, 0, 70.00, 0.00, 5.2, 8.1, FALSE, 0, NOW()),
(2, '2024-01-22', '2024-01-28', 4, 2024, 4780, 32, 465, 1, 73.38, 4.83, 6.8, 15.3, TRUE, 1, NOW());

-- Insert sample learning sessions
INSERT INTO learning_session_tracking (
    id, student_id, session_start, session_end, total_duration,
    exercises_attempted, exercises_completed, competences_worked,
    average_score, xp_earned, focus_score, motivation_level,
    device_type, created_at
) VALUES
('550e8400-e29b-41d4-a716-446655440001', 1, '2024-01-28 10:00:00', '2024-01-28 10:25:00', 1500, 4, 3, '["CP.FR.L1.3", "CP.MA.N2.3"]', 78.50, 45, 85.2, 'high', 'tablet', NOW()),
('550e8400-e29b-41d4-a716-446655440002', 1, '2024-01-28 15:30:00', '2024-01-28 15:55:00', 1480, 3, 3, '["CP.MA.N1.4"]', 88.30, 55, 92.1, 'high', 'desktop', NOW()),
('550e8400-e29b-41d4-a716-446655440003', 2, '2024-01-28 14:00:00', '2024-01-28 14:20:00', 1200, 2, 1, '["CP.FR.L1.1"]', 65.00, 25, 72.3, 'neutral', 'mobile', NOW());

-- Insert sample achievements
INSERT INTO student_achievements (
    student_id, achievement_type, achievement_code, title, description,
    category, difficulty, xp_reward, current_progress, max_progress,
    is_completed, completed_at, created_at, updated_at
) VALUES
(1, 'competence_mastery', 'FIRST_PHONEME_MASTER', 'Maître des Phonèmes', 'Première compétence de phonétique maîtrisée', 'academic', 'bronze', 50, 100, 100, TRUE, '2024-01-20 14:30:00', NOW(), NOW()),
(1, 'streak', 'WEEK_STREAK', 'Une Semaine Assidue', '7 jours consécutifs d\'apprentissage', 'engagement', 'silver', 100, 6, 7, FALSE, NULL, NOW(), NOW()),
(1, 'score_milestone', 'SCORE_80_PLUS', 'Excellence Scolaire', 'Moyenne de 80% sur 10 exercices', 'academic', 'gold', 150, 8, 10, FALSE, NULL, NOW(), NOW()),

(2, 'competence_mastery', 'FIRST_NUMBER_MASTER', 'Roi du Dénombrement', 'Dénombrement parfaitement maîtrisé', 'academic', 'bronze', 50, 100, 100, TRUE, '2024-01-22 14:45:00', NOW(), NOW()),
(2, 'time_goal', 'DAILY_30MIN', 'Marathonien Quotidien', '30 minutes d\'apprentissage par jour', 'engagement', 'bronze', 75, 4, 5, FALSE, NULL, NOW(), NOW());

-- =============================================================================
-- ANALYTICS AGGREGATION DATA
-- =============================================================================

-- Insert sample exercise performance analytics
INSERT INTO exercise_performance_analytics (
    exercise_id, competence_code, week_of_year, year_number,
    total_attempts, successful_attempts, average_score, average_completion_time,
    perceived_difficulty, dropoff_rate, retry_rate, optimal_difficulty_level,
    created_at, last_updated
) VALUES
-- Assuming exercise IDs 1, 2, 3 exist
(1, 'CP.FR.L1.1', 3, 2024, 35, 28, 82.5, 180, 3.2, 15.5, 25.8, 1.1, NOW(), NOW()),
(1, 'CP.FR.L1.1', 4, 2024, 42, 36, 85.1, 165, 2.8, 12.3, 22.1, 1.0, NOW(), NOW()),
(2, 'CP.MA.N1.1', 3, 2024, 48, 42, 88.9, 145, 2.5, 8.9, 18.5, 0.9, NOW(), NOW()),
(2, 'CP.MA.N1.1', 4, 2024, 52, 47, 91.2, 138, 2.2, 7.1, 16.8, 0.8, NOW(), NOW()),
(3, 'CP.FR.L1.3', 4, 2024, 28, 20, 75.8, 220, 4.1, 22.3, 35.2, 1.3, NOW(), NOW());

-- =============================================================================
-- UTILITY QUERIES FOR VERIFICATION
-- =============================================================================

-- Verify prerequisite chain integrity
-- This query checks if there are any circular dependencies
/*
WITH RECURSIVE prereq_chain AS (
    SELECT competence_code, prerequisite_code, 1 as depth, 
           CAST(competence_code AS CHAR(1000)) as path
    FROM competence_prerequisites
    WHERE competence_code NOT IN (SELECT DISTINCT prerequisite_code FROM competence_prerequisites)
    
    UNION ALL
    
    SELECT p.competence_code, p.prerequisite_code, pc.depth + 1,
           CONCAT(pc.path, ' -> ', p.competence_code)
    FROM competence_prerequisites p
    JOIN prereq_chain pc ON p.prerequisite_code = pc.competence_code
    WHERE pc.depth < 10 -- Prevent infinite recursion
    AND FIND_IN_SET(p.competence_code, REPLACE(pc.path, ' -> ', ',')) = 0
)
SELECT * FROM prereq_chain WHERE depth > 5;
*/