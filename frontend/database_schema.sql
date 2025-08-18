-- =============================================================================
-- BASE DE DONNÉES CP 2025 - APPLICATION D'APPRENTISSAGE
-- =============================================================================

-- Création de la base de données
CREATE DATABASE IF NOT EXISTS cp_learning_db;
USE cp_learning_db;

-- =============================================================================
-- TABLE DES ÉLÈVES
-- =============================================================================
CREATE TABLE students (
    id INT PRIMARY KEY AUTO_INCREMENT,
    prenom VARCHAR(50) NOT NULL,
    nom VARCHAR(50) NOT NULL,
    identifiant VARCHAR(20) UNIQUE NOT NULL,
    mot_de_passe VARCHAR(255) NOT NULL,
    classe VARCHAR(10) NOT NULL DEFAULT 'CP',
    niveau VARCHAR(10) NOT NULL DEFAULT 'CP',
    age_group ENUM('6-8', '9-11') NOT NULL DEFAULT '6-8',
    date_inscription DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME,
    total_xp INT DEFAULT 0,
    current_level INT DEFAULT 1,
    current_streak INT DEFAULT 0,
    hearts_remaining INT DEFAULT 3,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- =============================================================================
-- TABLE DES COMPÉTENCES CP 2025
-- =============================================================================
CREATE TABLE competences_cp (
    id INT PRIMARY KEY AUTO_INCREMENT,
    code VARCHAR(20) UNIQUE NOT NULL, -- ex: CP.FR.L1.1
    nom VARCHAR(200) NOT NULL,
    matiere ENUM('FR', 'MA') NOT NULL, -- FR: Français, MA: Mathématiques
    domaine VARCHAR(10) NOT NULL, -- L, C, E, G, N, P, G, M, D
    niveau_comp INT NOT NULL, -- 1, 2, 3, 4, 5
    sous_competence INT NOT NULL, -- 1, 2, 3, 4, 5
    description TEXT,
    seuil_maitrise DECIMAL(3,2) DEFAULT 0.80, -- 80% de réussite
    xp_reward INT DEFAULT 10,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- =============================================================================
-- TABLE DES EXERCICES
-- =============================================================================
CREATE TABLE exercises (
    id INT PRIMARY KEY AUTO_INCREMENT,
    competence_id INT NOT NULL,
    type ENUM('CALCUL', 'MENTAL_MATH', 'DRAG_DROP', 'QCM', 'LECTURE', 'ECRITURE', 'COMPREHENSION') NOT NULL,
    question TEXT NOT NULL,
    correct_answer TEXT NOT NULL,
    options JSON, -- Pour les QCM et choix multiples
    difficulty_level INT NOT NULL DEFAULT 3, -- 0-5 SuperMemo
    xp_reward INT DEFAULT 5,
    time_limit INT DEFAULT 60, -- en secondes
    hints_available INT DEFAULT 0,
    hints_text JSON, -- Texte des indices
    metadata JSON, -- Données supplémentaires (images, sons, etc.)
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (competence_id) REFERENCES competences_cp(id) ON DELETE CASCADE
);

-- =============================================================================
-- TABLE DES PROGRÈS DES ÉLÈVES
-- =============================================================================
CREATE TABLE student_progress (
    id INT PRIMARY KEY AUTO_INCREMENT,
    student_id INT NOT NULL,
    competence_id INT NOT NULL,
    status ENUM('not_started', 'learning', 'mastered', 'failed') DEFAULT 'not_started',
    current_level INT DEFAULT 0, -- 0-5 SuperMemo
    success_rate DECIMAL(3,2) DEFAULT 0.00,
    attempts_count INT DEFAULT 0,
    correct_attempts INT DEFAULT 0,
    last_practice_date DATETIME,
    next_review_date DATETIME,
    repetition_number INT DEFAULT 0,
    easiness_factor DECIMAL(3,2) DEFAULT 2.5,
    total_time_spent INT DEFAULT 0, -- en secondes
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (competence_id) REFERENCES competences_cp(id) ON DELETE CASCADE,
    UNIQUE KEY unique_student_competence (student_id, competence_id)
);

-- =============================================================================
-- TABLE DES SESSIONS D'APPRENTISSAGE
-- =============================================================================
CREATE TABLE learning_sessions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    student_id INT NOT NULL,
    started_at DATETIME NOT NULL,
    ended_at DATETIME,
    exercises_completed INT DEFAULT 0,
    total_xp_gained INT DEFAULT 0,
    performance_score DECIMAL(3,2),
    session_duration INT DEFAULT 0, -- en secondes
    competences_worked JSON, -- Liste des compétences travaillées
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- =============================================================================
-- TABLE DES RÉSULTATS D'EXERCICES
-- =============================================================================
CREATE TABLE exercise_results (
    id INT PRIMARY KEY AUTO_INCREMENT,
    session_id INT NOT NULL,
    student_id INT NOT NULL,
    exercise_id INT NOT NULL,
    competence_id INT NOT NULL,
    is_correct BOOLEAN NOT NULL,
    time_spent INT DEFAULT 0, -- en secondes
    hints_used INT DEFAULT 0,
    supermemo_quality INT DEFAULT 3, -- 0-5
    answer_given TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES learning_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE,
    FOREIGN KEY (competence_id) REFERENCES competences_cp(id) ON DELETE CASCADE
);

-- =============================================================================
-- TABLE DES MASCOTS
-- =============================================================================
CREATE TABLE mascots (
    id INT PRIMARY KEY AUTO_INCREMENT,
    student_id INT NOT NULL UNIQUE,
    type ENUM('dragon', 'fairy', 'robot', 'cat', 'owl') DEFAULT 'dragon',
    current_emotion ENUM('idle', 'happy', 'thinking', 'celebrating', 'oops') DEFAULT 'happy',
    xp_level INT DEFAULT 1,
    equipped_items JSON DEFAULT '[]',
    ai_state JSON, -- État de l'IA du mascot
    last_interaction DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- =============================================================================
-- TABLE DES OBJETS DE GARDE-ROBE
-- =============================================================================
CREATE TABLE wardrobe_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    type ENUM('hat', 'clothing', 'accessory', 'shoes', 'special') NOT NULL,
    rarity ENUM('common', 'rare', 'epic', 'legendary') DEFAULT 'common',
    unlock_requirement_type ENUM('xp', 'streak', 'exercises', 'achievement') NOT NULL,
    unlock_requirement_value INT NOT NULL,
    mascot_compatibility JSON, -- Types de mascots compatibles
    position_data JSON, -- Position 3D
    color INT DEFAULT 0xFFFFFF,
    geometry_type VARCHAR(20) DEFAULT 'box',
    magical_effect BOOLEAN DEFAULT FALSE,
    description TEXT,
    icon VARCHAR(10),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- TABLE DE LA GARDE-ROBE DES ÉLÈVES
-- =============================================================================
CREATE TABLE student_wardrobe (
    id INT PRIMARY KEY AUTO_INCREMENT,
    student_id INT NOT NULL,
    item_id INT NOT NULL,
    unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_equipped BOOLEAN DEFAULT FALSE,
    equipped_at DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES wardrobe_items(id) ON DELETE CASCADE,
    UNIQUE KEY unique_student_item (student_id, item_id)
);

-- =============================================================================
-- TABLE DES RÉALISATIONS
-- =============================================================================
CREATE TABLE achievements (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(10),
    requirement_type ENUM('xp', 'streak', 'exercises', 'competences') NOT NULL,
    requirement_value INT NOT NULL,
    xp_reward INT DEFAULT 0,
    rarity ENUM('common', 'rare', 'epic', 'legendary') DEFAULT 'common',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- TABLE DES RÉALISATIONS DÉBLOQUÉES
-- =============================================================================
CREATE TABLE student_achievements (
    id INT PRIMARY KEY AUTO_INCREMENT,
    student_id INT NOT NULL,
    achievement_id INT NOT NULL,
    unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (achievement_id) REFERENCES achievements(id) ON DELETE CASCADE,
    UNIQUE KEY unique_student_achievement (student_id, achievement_id)
);

-- =============================================================================
-- TABLE DES STATISTIQUES
-- =============================================================================
CREATE TABLE student_stats (
    id INT PRIMARY KEY AUTO_INCREMENT,
    student_id INT NOT NULL UNIQUE,
    total_exercises_completed INT DEFAULT 0,
    total_correct_answers INT DEFAULT 0,
    total_time_spent INT DEFAULT 0, -- en secondes
    average_performance DECIMAL(3,2) DEFAULT 0.00,
    longest_streak INT DEFAULT 0,
    competences_mastered INT DEFAULT 0,
    total_achievements INT DEFAULT 0,
    last_activity DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- =============================================================================
-- INDEX POUR OPTIMISER LES PERFORMANCES
-- =============================================================================

-- Index pour les requêtes fréquentes
CREATE INDEX idx_student_progress_student ON student_progress(student_id);
CREATE INDEX idx_student_progress_competence ON student_progress(competence_id);
CREATE INDEX idx_student_progress_status ON student_progress(status);
CREATE INDEX idx_exercise_results_student ON exercise_results(student_id);
CREATE INDEX idx_exercise_results_session ON exercise_results(session_id);
CREATE INDEX idx_learning_sessions_student ON learning_sessions(student_id);
CREATE INDEX idx_learning_sessions_date ON learning_sessions(started_at);

-- Index pour les compétences
CREATE INDEX idx_competences_matiere ON competences_cp(matiere);
CREATE INDEX idx_competences_domaine ON competences_cp(domaine);
CREATE INDEX idx_exercises_competence ON exercises(competence_id);
CREATE INDEX idx_exercises_type ON exercises(type);

-- =============================================================================
-- VUES UTILES POUR L'APPLICATION
-- =============================================================================

-- Vue des compétences non maîtrisées par élève
CREATE VIEW competences_non_maitrisees AS
SELECT 
    s.id as student_id,
    s.prenom,
    c.id as competence_id,
    c.code,
    c.nom,
    c.matiere,
    sp.status,
    sp.current_level,
    sp.success_rate,
    sp.attempts_count
FROM students s
CROSS JOIN competences_cp c
LEFT JOIN student_progress sp ON s.id = sp.student_id AND c.id = sp.competence_id
WHERE sp.status != 'mastered' OR sp.status IS NULL;

-- Vue des exercices obligatoires du jour
CREATE VIEW exercices_obligatoires AS
SELECT 
    s.id as student_id,
    s.prenom,
    c.code as competence_code,
    c.nom as competence_nom,
    e.id as exercise_id,
    e.type as exercise_type,
    e.question,
    e.difficulty_level,
    sp.current_level,
    sp.status
FROM students s
JOIN student_progress sp ON s.id = sp.student_id
JOIN competences_cp c ON sp.competence_id = c.id
JOIN exercises e ON c.id = e.competence_id
WHERE sp.status IN ('failed', 'learning', 'not_started')
AND e.is_active = TRUE
ORDER BY 
    CASE sp.status 
        WHEN 'failed' THEN 1 
        WHEN 'learning' THEN 2 
        WHEN 'not_started' THEN 3 
    END,
    sp.success_rate ASC;

-- =============================================================================
-- DONNÉES DE TEST
-- =============================================================================

-- Insertion d'un élève de test
INSERT INTO students (prenom, nom, identifiant, mot_de_passe, classe, age_group) VALUES
('Emma', 'Martin', 'emma.cp1', 'password123', 'CP', '6-8'),
('Lucas', 'Dubois', 'lucas.cp1', 'password123', 'CP', '6-8'),
('Léa', 'Bernard', 'lea.cp1', 'password123', 'CP', '6-8');

-- Insertion de compétences CP 2025 (exemples)
INSERT INTO competences_cp (code, nom, matiere, domaine, niveau_comp, sous_competence, description) VALUES
-- Français - Lecture
('CP.FR.L1.1', 'Maîtriser les 15 CGP de la Période 1', 'FR', 'L', 1, 1, 'Voyelles + consonnes de base'),
('CP.FR.L1.2', 'Maîtriser les 25-30 CGP supplémentaires de la Période 2', 'FR', 'L', 1, 2, 'Consonnes et voyelles étendues'),
('CP.FR.L1.3', 'Maîtriser les consonnes complexes et voyelles nasales', 'FR', 'L', 1, 3, 'Période 3'),
('CP.FR.L2.1', 'Assembler phonèmes en syllabes CV', 'FR', 'L', 2, 1, 'Combinatoire de base'),
('CP.FR.L2.2', 'Décoder structures CVC et CCV', 'FR', 'L', 2, 2, 'Structures syllabiques'),
('CP.FR.C1.1', 'Comprendre phrases simples déchiffrables', 'FR', 'C', 1, 1, 'Compréhension de base'),
('CP.FR.C1.2', 'Identifier informations explicites dans une phrase', 'FR', 'C', 1, 2, 'Compréhension explicite'),
('CP.FR.E1.1', 'Maîtriser l\'écriture cursive sur réglure 3mm', 'FR', 'E', 1, 1, 'Geste graphique'),
('CP.FR.E2.1', 'Écrire sous dictée syllabes et mots déchiffrables', 'FR', 'E', 2, 1, 'Orthographe de base'),

-- Mathématiques - Nombres
('CP.MA.N1.1', 'Maîtriser nombres 0-10', 'MA', 'N', 1, 1, 'Construction du nombre'),
('CP.MA.N1.2', 'Maîtriser nombres 11-20', 'MA', 'N', 1, 2, 'Nombres jusqu\'à 20'),
('CP.MA.N1.3', 'Maîtriser nombres 21-59', 'MA', 'N', 1, 3, 'Nombres jusqu\'à 59'),
('CP.MA.N2.1', 'Décomposer nombres < 10', 'MA', 'N', 2, 1, 'Décomposition de base'),
('CP.MA.N2.2', 'Décomposer nombres 10-20', 'MA', 'N', 2, 2, 'Dizaines et unités'),
('CP.MA.N3.1', 'Automatiser additions dans les 10', 'MA', 'N', 3, 1, 'Calcul mental addition'),
('CP.MA.N3.2', 'Automatiser soustractions dans les 10', 'MA', 'N', 3, 2, 'Calcul mental soustraction'),
('CP.MA.N4.1', 'Comprendre le sens de l\'addition', 'MA', 'N', 4, 1, 'Sens des opérations'),
('CP.MA.P1.1', 'Résoudre problèmes d\'addition simple', 'MA', 'P', 1, 1, 'Problèmes additifs'),
('CP.MA.P1.2', 'Résoudre problèmes de soustraction', 'MA', 'P', 1, 2, 'Problèmes soustractifs'),
('CP.MA.G1.1', 'Reconnaître carré, rectangle, triangle, cercle', 'MA', 'G', 1, 1, 'Formes géométriques');

-- Insertion d'exercices (exemples)
INSERT INTO exercises (competence_id, type, question, correct_answer, options, difficulty_level) VALUES
-- Exercices pour CP.FR.L1.1 (CGP Période 1)
(1, 'QCM', 'Quel son fait la lettre "a" ?', 'a', '["a", "e", "i", "o"]', 0),
(1, 'QCM', 'Dans le mot "papa", quel son fait "a" ?', 'a', '["a", "e", "i", "o"]', 1),
(1, 'LECTURE', 'Lis la syllabe "pa"', 'pa', NULL, 2),
(1, 'LECTURE', 'Lis le mot "papa"', 'papa', NULL, 3),

-- Exercices pour CP.MA.N3.1 (Addition dans les 10)
(16, 'CALCUL', 'Calcule: 3 + 2 = ?', '5', '["3", "4", "5", "6"]', 0),
(16, 'CALCUL', 'Calcule: 5 + 3 = ?', '8', '["6", "7", "8", "9"]', 1),
(16, 'CALCUL', 'Calcule: 7 + 2 = ?', '9', '["7", "8", "9", "10"]', 2),
(16, 'MENTAL_MATH', 'Calcule rapidement: 4 + 3', '7', '["6", "7", "8", "9"]', 3);

-- Insertion de mascots pour les élèves
INSERT INTO mascots (student_id, type, current_emotion) VALUES
(1, 'dragon', 'happy'),
(2, 'fairy', 'idle'),
(3, 'robot', 'thinking');

-- Insertion d'objets de garde-robe
INSERT INTO wardrobe_items (name, type, rarity, unlock_requirement_type, unlock_requirement_value, description, icon) VALUES
('Chapeau de Magicien', 'hat', 'epic', 'xp', 1000, 'Un chapeau magique qui scintille d\'étoiles !', '🧙‍♂️'),
('Couronne Royale', 'hat', 'legendary', 'streak', 30, 'Pour les vrais champions de l\'apprentissage !', '👑'),
('Casquette Cool', 'hat', 'common', 'exercises', 10, 'Style décontracté pour apprendre !', '🧢'),
('Baguette Magique', 'accessory', 'epic', 'achievement', 10, 'Transforme chaque erreur en apprentissage !', '🪄'),
('Médaille d\'Or', 'accessory', 'epic', 'streak', 21, 'Champion de l\'apprentissage !', '🥇');

-- Insertion de réalisations
INSERT INTO achievements (name, description, icon, requirement_type, requirement_value, xp_reward) VALUES
('Premier Pas', 'Compléter ton premier exercice', '👣', 'exercises', 1, 10),
('Lecteur Débutant', 'Maîtriser 5 compétences de lecture', '📚', 'competences', 5, 50),
('Calculateur', 'Maîtriser 5 compétences de mathématiques', '🔢', 'competences', 5, 50),
('Persévérant', 'Maintenir une série de 7 jours', '🔥', 'streak', 7, 100),
('Expert CP', 'Maîtriser toutes les compétences CP', '🏆', 'competences', 20, 500);

-- Insertion de statistiques pour les élèves
INSERT INTO student_stats (student_id, total_exercises_completed, total_correct_answers, competences_mastered) VALUES
(1, 0, 0, 0),
(2, 0, 0, 0),
(3, 0, 0, 0);

-- =============================================================================
-- PROCÉDURES STOCKÉES UTILES
-- =============================================================================

-- Procédure pour obtenir les exercices obligatoires d'un élève
DELIMITER //
CREATE PROCEDURE GetMandatoryExercises(IN student_id_param INT)
BEGIN
    SELECT 
        e.id as exercise_id,
        e.type as exercise_type,
        e.question,
        e.correct_answer,
        e.options,
        e.difficulty_level,
        c.code as competence_code,
        c.nom as competence_nom,
        sp.current_level,
        sp.status,
        sp.success_rate
    FROM students s
    JOIN student_progress sp ON s.id = sp.student_id
    JOIN competences_cp c ON sp.competence_id = c.id
    JOIN exercises e ON c.id = e.competence_id
    WHERE s.id = student_id_param
    AND sp.status IN ('failed', 'learning', 'not_started')
    AND e.is_active = TRUE
    ORDER BY 
        CASE sp.status 
            WHEN 'failed' THEN 1 
            WHEN 'learning' THEN 2 
            WHEN 'not_started' THEN 3 
        END,
        sp.success_rate ASC,
        e.difficulty_level ASC
    LIMIT 10;
END //
DELIMITER ;

-- Procédure pour mettre à jour le progrès d'un élève
DELIMITER //
CREATE PROCEDURE UpdateStudentProgress(
    IN student_id_param INT,
    IN competence_id_param INT,
    IN is_correct BOOLEAN,
    IN supermemo_quality INT,
    IN time_spent INT
)
BEGIN
    DECLARE current_status VARCHAR(20);
    DECLARE current_success_rate DECIMAL(3,2);
    DECLARE current_attempts INT;
    DECLARE new_success_rate DECIMAL(3,2);
    DECLARE new_status VARCHAR(20);
    
    -- Récupérer les données actuelles
    SELECT status, success_rate, attempts_count 
    INTO current_status, current_success_rate, current_attempts
    FROM student_progress 
    WHERE student_id = student_id_param AND competence_id = competence_id_param;
    
    -- Calculer le nouveau taux de réussite
    SET new_success_rate = (current_success_rate * current_attempts + (is_correct ? 1 : 0)) / (current_attempts + 1);
    
    -- Déterminer le nouveau statut
    IF new_success_rate >= 0.8 THEN
        SET new_status = 'mastered';
    ELSEIF current_status = 'not_started' THEN
        SET new_status = 'learning';
    ELSE
        SET new_status = current_status;
    END IF;
    
    -- Mettre à jour le progrès
    INSERT INTO student_progress (student_id, competence_id, status, success_rate, attempts_count, correct_attempts, last_practice_date, current_level)
    VALUES (student_id_param, competence_id_param, new_status, new_success_rate, current_attempts + 1, current_attempts + (is_correct ? 1 : 0), NOW(), supermemo_quality)
    ON DUPLICATE KEY UPDATE
        status = new_status,
        success_rate = new_success_rate,
        attempts_count = attempts_count + 1,
        correct_attempts = correct_attempts + (is_correct ? 1 : 0),
        last_practice_date = NOW(),
        current_level = supermemo_quality;
END //
DELIMITER ;

-- =============================================================================
-- FIN DU SCHÉMA
-- ============================================================================= 