-- =============================================================================
-- CP 2025 DATABASE MIGRATION - MySQL Setup
-- =============================================================================
-- This script creates all the necessary tables for the FastRevEd Kids platform
-- Based on the CP 2025 French curriculum for elementary education (6-11 years)
-- =============================================================================

-- Création de la base de données (will be done via config)
-- CREATE DATABASE IF NOT EXISTS cp_learning_db;
-- USE cp_learning_db;

-- =============================================================================
-- TABLE DES ÉLÈVES
-- =============================================================================
CREATE TABLE IF NOT EXISTS students (
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
CREATE TABLE IF NOT EXISTS competences_cp (
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
CREATE TABLE IF NOT EXISTS exercises (
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
CREATE TABLE IF NOT EXISTS student_progress (
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
CREATE TABLE IF NOT EXISTS learning_sessions (
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
CREATE TABLE IF NOT EXISTS exercise_results (
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
CREATE TABLE IF NOT EXISTS mascots (
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
CREATE TABLE IF NOT EXISTS wardrobe_items (
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
CREATE TABLE IF NOT EXISTS student_wardrobe (
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
CREATE TABLE IF NOT EXISTS achievements (
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
CREATE TABLE IF NOT EXISTS student_achievements (
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
CREATE TABLE IF NOT EXISTS student_stats (
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
CREATE INDEX IF NOT EXISTS idx_student_progress_student ON student_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_student_progress_competence ON student_progress(competence_id);
CREATE INDEX IF NOT EXISTS idx_student_progress_status ON student_progress(status);
CREATE INDEX IF NOT EXISTS idx_exercise_results_student ON exercise_results(student_id);
CREATE INDEX IF NOT EXISTS idx_exercise_results_session ON exercise_results(session_id);
CREATE INDEX IF NOT EXISTS idx_learning_sessions_student ON learning_sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_learning_sessions_date ON learning_sessions(started_at);

-- Index pour les compétences
CREATE INDEX IF NOT EXISTS idx_competences_matiere ON competences_cp(matiere);
CREATE INDEX IF NOT EXISTS idx_competences_domaine ON competences_cp(domaine);
CREATE INDEX IF NOT EXISTS idx_exercises_competence ON exercises(competence_id);
CREATE INDEX IF NOT EXISTS idx_exercises_type ON exercises(type);