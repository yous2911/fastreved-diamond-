-- CP2025 Enhanced Database Schema - Student Progress Tracking, Prerequisites & Analytics
-- MySQL Schema for comprehensive educational tracking system

-- =============================================================================
-- STUDENT PROGRESS TRACKING TABLES
-- =============================================================================

-- Enhanced student competence progress tracking
CREATE TABLE IF NOT EXISTS student_competence_progress (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    competence_code VARCHAR(20) NOT NULL,
    niveau ENUM('CP', 'CE1', 'CE2', 'CM1', 'CM2', 'CP-CE1') NOT NULL,
    matiere ENUM('FRANCAIS', 'MATHEMATIQUES', 'SCIENCES', 'HISTOIRE_GEOGRAPHIE', 'ANGLAIS') NOT NULL,
    domaine VARCHAR(10) NOT NULL,
    
    -- Progress tracking fields
    mastery_level ENUM('not_started', 'discovering', 'practicing', 'mastering', 'mastered') DEFAULT 'not_started',
    progress_percent INT DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
    total_attempts INT DEFAULT 0,
    successful_attempts INT DEFAULT 0,
    average_score DECIMAL(5,2) DEFAULT 0.00 CHECK (average_score >= 0 AND average_score <= 100),
    
    -- Time tracking
    total_time_spent INT DEFAULT 0, -- seconds
    average_time_per_attempt INT DEFAULT 0, -- seconds
    
    -- Adaptive learning data
    difficulty_level DECIMAL(3,1) DEFAULT 1.0 CHECK (difficulty_level >= 0.5 AND difficulty_level <= 2.0),
    consecutive_successes INT DEFAULT 0,
    consecutive_failures INT DEFAULT 0,
    
    -- Timestamps
    first_attempt_at TIMESTAMP NULL,
    last_attempt_at TIMESTAMP NULL,
    mastered_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Indexes
    INDEX idx_student_competence (student_id, competence_code),
    INDEX idx_competence_code (competence_code),
    INDEX idx_mastery_level (mastery_level),
    INDEX idx_niveau_matiere (niveau, matiere),
    
    -- Foreign key reference (assumes students table exists)
    FOREIGN KEY (competence_code) REFERENCES cp2025_competence_codes(code) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- COMPETENCE PREREQUISITES TABLES
-- =============================================================================

-- Competence prerequisites and dependencies
CREATE TABLE IF NOT EXISTS competence_prerequisites (
    id INT AUTO_INCREMENT PRIMARY KEY,
    competence_code VARCHAR(20) NOT NULL COMMENT 'Target competence that requires prerequisites',
    prerequisite_code VARCHAR(20) NOT NULL COMMENT 'Required prerequisite competence',
    
    -- Prerequisite type and strength
    prerequisite_type ENUM('required', 'recommended', 'helpful') DEFAULT 'required',
    mastery_threshold INT DEFAULT 80 CHECK (mastery_threshold >= 0 AND mastery_threshold <= 100),
    
    -- Learning path metadata
    weight DECIMAL(3,1) DEFAULT 1.0 CHECK (weight >= 0.1 AND weight <= 5.0),
    description TEXT COMMENT 'Explanation of why this prerequisite is important',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Indexes
    INDEX idx_competence_prerequisites (competence_code),
    INDEX idx_prerequisite_lookup (prerequisite_code),
    INDEX idx_prerequisite_type (prerequisite_type),
    
    -- Unique constraint to prevent duplicates
    UNIQUE KEY unique_prerequisite (competence_code, prerequisite_code),
    
    -- Foreign keys
    FOREIGN KEY (competence_code) REFERENCES cp2025_competence_codes(code) ON UPDATE CASCADE,
    FOREIGN KEY (prerequisite_code) REFERENCES cp2025_competence_codes(code) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Student learning path and adaptive recommendations
CREATE TABLE IF NOT EXISTS student_learning_path (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    competence_code VARCHAR(20) NOT NULL,
    
    -- Path status
    status ENUM('locked', 'available', 'in_progress', 'completed', 'skipped') DEFAULT 'available',
    priority ENUM('low', 'normal', 'high', 'urgent') DEFAULT 'normal',
    
    -- Adaptive recommendations
    recommended_difficulty ENUM('decouverte', 'entrainement', 'consolidation', 'approfondissement') DEFAULT 'decouverte',
    estimated_completion_time INT COMMENT 'Estimated time in minutes',
    personalized_order INT DEFAULT 0,
    
    -- Blocking and unlocking logic
    is_blocked BOOLEAN DEFAULT FALSE,
    blocking_reasons JSON COMMENT 'Array of missing prerequisites',
    unlocked_at TIMESTAMP NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Indexes
    INDEX idx_student_learning_path (student_id, competence_code),
    INDEX idx_path_status (status),
    INDEX idx_priority (priority),
    INDEX idx_personalized_order (student_id, personalized_order),
    
    -- Unique constraint
    UNIQUE KEY unique_student_competence (student_id, competence_code),
    
    -- Foreign keys
    FOREIGN KEY (competence_code) REFERENCES cp2025_competence_codes(code) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- ANALYTICS AND REPORTING TABLES
-- =============================================================================

-- Daily learning analytics aggregation
CREATE TABLE IF NOT EXISTS daily_learning_analytics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    analytics_date DATE NOT NULL,
    
    -- Activity metrics
    total_session_time INT DEFAULT 0 COMMENT 'Total time in seconds',
    exercises_attempted INT DEFAULT 0,
    exercises_completed INT DEFAULT 0,
    average_score DECIMAL(5,2) DEFAULT 0.00,
    
    -- Subject breakdown (time in seconds)
    francais_time INT DEFAULT 0,
    mathematiques_time INT DEFAULT 0,
    sciences_time INT DEFAULT 0,
    histoire_geographie_time INT DEFAULT 0,
    anglais_time INT DEFAULT 0,
    
    -- Competence progress metrics
    competences_mastered INT DEFAULT 0,
    competences_progressed INT DEFAULT 0,
    
    -- Engagement metrics
    streak_days INT DEFAULT 0,
    xp_earned INT DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes
    PRIMARY KEY (id),
    UNIQUE KEY unique_student_date (student_id, analytics_date),
    INDEX idx_analytics_date (analytics_date),
    INDEX idx_student_analytics (student_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Weekly progress summaries
CREATE TABLE IF NOT EXISTS weekly_progress_summary (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    week_start_date DATE NOT NULL COMMENT 'Monday of the week',
    week_end_date DATE NOT NULL COMMENT 'Sunday of the week',
    week_of_year INT NOT NULL,
    year_number INT NOT NULL,
    
    -- Weekly totals
    total_learning_time INT DEFAULT 0 COMMENT 'Total time in seconds',
    total_exercises INT DEFAULT 0,
    total_xp_earned INT DEFAULT 0,
    
    -- Progress metrics
    competences_mastered INT DEFAULT 0,
    average_score DECIMAL(5,2) DEFAULT 0.00,
    improvement_rate DECIMAL(5,2) DEFAULT 0.00 COMMENT 'Percentage improvement from previous week',
    
    -- Subject performance (percentage progress)
    francais_progress DECIMAL(5,2) DEFAULT 0.00,
    mathematiques_progress DECIMAL(5,2) DEFAULT 0.00,
    sciences_progress DECIMAL(5,2) DEFAULT 0.00,
    histoire_geographie_progress DECIMAL(5,2) DEFAULT 0.00,
    anglais_progress DECIMAL(5,2) DEFAULT 0.00,
    
    -- Goals and achievements
    weekly_goal_met BOOLEAN DEFAULT FALSE,
    achievements_unlocked INT DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes
    UNIQUE KEY unique_student_week (student_id, week_start_date),
    INDEX idx_week_year (year_number, week_of_year),
    INDEX idx_student_weekly (student_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Individual learning session tracking
CREATE TABLE IF NOT EXISTS learning_session_tracking (
    id VARCHAR(36) PRIMARY KEY COMMENT 'UUID for session identification',
    student_id INT NOT NULL,
    
    -- Session metadata
    session_start TIMESTAMP NOT NULL,
    session_end TIMESTAMP NULL,
    total_duration INT DEFAULT 0 COMMENT 'Session duration in seconds',
    
    -- Activity tracking
    exercises_attempted INT DEFAULT 0,
    exercises_completed INT DEFAULT 0,
    competences_worked JSON COMMENT 'Array of competence codes worked on',
    
    -- Performance metrics
    average_score DECIMAL(5,2) DEFAULT 0.00,
    xp_earned INT DEFAULT 0,
    streak_increment INT DEFAULT 0,
    
    -- Engagement metrics
    focus_score DECIMAL(5,2) DEFAULT 0.00 COMMENT 'Focus score 0-100 based on consistency',
    motivation_level ENUM('low', 'neutral', 'high') DEFAULT 'neutral',
    
    -- Technical context
    device_type ENUM('mobile', 'tablet', 'desktop') NULL,
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes
    INDEX idx_student_sessions (student_id, session_start),
    INDEX idx_session_date (session_start),
    INDEX idx_session_duration (total_duration)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Exercise performance analytics (aggregated weekly)
CREATE TABLE IF NOT EXISTS exercise_performance_analytics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    exercise_id INT NOT NULL,
    competence_code VARCHAR(20) NOT NULL,
    week_of_year INT NOT NULL,
    year_number INT NOT NULL,
    
    -- Performance aggregates
    total_attempts INT DEFAULT 0,
    successful_attempts INT DEFAULT 0,
    average_score DECIMAL(5,2) DEFAULT 0.00,
    average_completion_time INT DEFAULT 0 COMMENT 'Average time in seconds',
    
    -- Difficulty analysis
    perceived_difficulty DECIMAL(3,1) DEFAULT 0.0 COMMENT 'Difficulty rating 0-10',
    dropoff_rate DECIMAL(5,2) DEFAULT 0.00 COMMENT 'Percentage of students who don\'t complete',
    retry_rate DECIMAL(5,2) DEFAULT 0.00 COMMENT 'Percentage of students who retry',
    
    -- Adaptive metrics
    optimal_difficulty_level DECIMAL(3,1) DEFAULT 1.0,
    recommended_prerequisites JSON COMMENT 'Array of recommended prerequisite codes',
    
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes
    UNIQUE KEY unique_exercise_week (exercise_id, week_of_year, year_number),
    INDEX idx_competence_analytics (competence_code),
    INDEX idx_week_analytics (year_number, week_of_year),
    
    -- Foreign keys
    FOREIGN KEY (competence_code) REFERENCES cp2025_competence_codes(code) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Student achievement and badge tracking
CREATE TABLE IF NOT EXISTS student_achievements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    
    -- Achievement metadata
    achievement_type ENUM('competence_mastery', 'streak', 'score_milestone', 'time_goal', 'special_event') NOT NULL,
    achievement_code VARCHAR(50) NOT NULL COMMENT 'Unique identifier for this achievement type',
    title VARCHAR(200) NOT NULL,
    description TEXT,
    
    -- Achievement classification
    category ENUM('academic', 'engagement', 'progress', 'social', 'special') NOT NULL,
    difficulty ENUM('bronze', 'silver', 'gold', 'platinum', 'diamond') DEFAULT 'bronze',
    xp_reward INT DEFAULT 0,
    badge_icon_url VARCHAR(500),
    
    -- Progress tracking
    current_progress INT DEFAULT 0,
    max_progress INT DEFAULT 100,
    is_completed BOOLEAN DEFAULT FALSE,
    completion_percentage DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE 
            WHEN max_progress > 0 THEN (current_progress / max_progress) * 100
            ELSE 0 
        END
    ) STORED,
    
    -- Completion tracking
    completed_at TIMESTAMP NULL,
    
    -- Display settings
    is_visible BOOLEAN DEFAULT TRUE,
    display_order INT DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Indexes
    INDEX idx_student_achievements (student_id),
    INDEX idx_achievement_type (achievement_type),
    INDEX idx_completion_status (is_completed, completed_at),
    INDEX idx_category (category),
    UNIQUE KEY unique_student_achievement (student_id, achievement_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- VIEWS FOR EASY QUERYING
-- =============================================================================

-- Comprehensive student progress view
CREATE OR REPLACE VIEW student_progress_overview AS
SELECT 
    s.id as student_id,
    s.prenom,
    s.nom,
    s.niveau_actuel,
    COUNT(scp.id) as total_competences_tracked,
    COUNT(CASE WHEN scp.mastery_level = 'mastered' THEN 1 END) as competences_mastered,
    COUNT(CASE WHEN scp.mastery_level IN ('practicing', 'mastering') THEN 1 END) as competences_in_progress,
    AVG(scp.progress_percent) as overall_progress_percent,
    AVG(scp.average_score) as overall_average_score,
    SUM(scp.total_time_spent) as total_learning_time,
    s.total_points,
    s.serie_jours as current_streak
FROM students s
LEFT JOIN student_competence_progress scp ON s.id = scp.student_id
GROUP BY s.id, s.prenom, s.nom, s.niveau_actuel, s.total_points, s.serie_jours;

-- Weekly analytics summary view
CREATE OR REPLACE VIEW weekly_analytics_summary AS
SELECT 
    wps.student_id,
    wps.week_start_date,
    wps.week_end_date,
    wps.total_learning_time,
    wps.total_exercises,
    wps.competences_mastered,
    wps.average_score,
    wps.improvement_rate,
    wps.weekly_goal_met,
    COUNT(lst.id) as total_sessions,
    AVG(lst.total_duration) as average_session_duration,
    AVG(lst.focus_score) as average_focus_score
FROM weekly_progress_summary wps
LEFT JOIN learning_session_tracking lst ON wps.student_id = lst.student_id 
    AND DATE(lst.session_start) BETWEEN wps.week_start_date AND wps.week_end_date
GROUP BY wps.id;

-- Competence mastery progression view
CREATE OR REPLACE VIEW competence_mastery_progression AS
SELECT 
    cc.code as competence_code,
    cc.niveau,
    cc.matiere,
    cc.domaine,
    cc.description as competence_description,
    COUNT(scp.id) as students_tracking,
    COUNT(CASE WHEN scp.mastery_level = 'mastered' THEN 1 END) as students_mastered,
    COUNT(CASE WHEN scp.mastery_level = 'not_started' THEN 1 END) as students_not_started,
    AVG(scp.progress_percent) as average_progress,
    AVG(scp.average_score) as average_score,
    AVG(scp.total_attempts) as average_attempts
FROM cp2025_competence_codes cc
LEFT JOIN student_competence_progress scp ON cc.code = scp.competence_code
GROUP BY cc.code, cc.niveau, cc.matiere, cc.domaine, cc.description;

-- =============================================================================
-- INDEXES FOR PERFORMANCE OPTIMIZATION
-- =============================================================================

-- Additional performance indexes
CREATE INDEX idx_student_progress_mastery ON student_competence_progress (student_id, mastery_level, updated_at);
CREATE INDEX idx_daily_analytics_week ON daily_learning_analytics (analytics_date, student_id);
CREATE INDEX idx_session_tracking_duration ON learning_session_tracking (student_id, total_duration DESC);
CREATE INDEX idx_achievements_completion ON student_achievements (student_id, is_completed, completed_at);
CREATE INDEX idx_learning_path_status ON student_learning_path (student_id, status, priority);

-- =============================================================================
-- TRIGGERS FOR DATA CONSISTENCY
-- =============================================================================

-- Trigger to automatically update learning path status when competence is mastered
DELIMITER //
CREATE TRIGGER update_learning_path_on_mastery
AFTER UPDATE ON student_competence_progress
FOR EACH ROW
BEGIN
    IF NEW.mastery_level = 'mastered' AND OLD.mastery_level != 'mastered' THEN
        UPDATE student_learning_path 
        SET status = 'completed', updated_at = CURRENT_TIMESTAMP
        WHERE student_id = NEW.student_id AND competence_code = NEW.competence_code;
        
        -- Unlock dependent competences
        UPDATE student_learning_path slp
        SET status = 'available', 
            is_blocked = FALSE, 
            unlocked_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE slp.student_id = NEW.student_id 
        AND slp.competence_code IN (
            SELECT cp.competence_code 
            FROM competence_prerequisites cp 
            WHERE cp.prerequisite_code = NEW.competence_code
        );
    END IF;
END;//
DELIMITER ;

-- Trigger to update daily analytics when session is completed
DELIMITER //
CREATE TRIGGER update_daily_analytics_on_session
AFTER UPDATE ON learning_session_tracking
FOR EACH ROW
BEGIN
    IF NEW.session_end IS NOT NULL AND OLD.session_end IS NULL THEN
        INSERT INTO daily_learning_analytics (
            student_id, 
            analytics_date, 
            total_session_time, 
            exercises_attempted, 
            exercises_completed,
            xp_earned
        ) VALUES (
            NEW.student_id,
            DATE(NEW.session_start),
            NEW.total_duration,
            NEW.exercises_attempted,
            NEW.exercises_completed,
            NEW.xp_earned
        ) ON DUPLICATE KEY UPDATE
            total_session_time = total_session_time + NEW.total_duration,
            exercises_attempted = exercises_attempted + NEW.exercises_attempted,
            exercises_completed = exercises_completed + NEW.exercises_completed,
            xp_earned = xp_earned + NEW.xp_earned;
    END IF;
END;//
DELIMITER ;