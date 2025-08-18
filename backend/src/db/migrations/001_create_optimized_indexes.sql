-- =====================================================================================
-- RevEd Kids Database Optimization: Comprehensive Indexing Strategy
-- This migration creates optimized indexes for all frequently queried fields
-- =====================================================================================

-- Use the database
USE reved_kids;

-- =====================================================================================
-- STUDENTS TABLE INDEXES
-- =====================================================================================

-- Primary lookup indexes
CREATE INDEX IF NOT EXISTS idx_students_email ON students(email);
CREATE INDEX IF NOT EXISTS idx_students_niveau_actuel ON students(niveau_actuel);
CREATE INDEX IF NOT EXISTS idx_students_niveau_scolaire ON students(niveau_scolaire);
CREATE INDEX IF NOT EXISTS idx_students_dernier_acces ON students(dernier_acces);
CREATE INDEX IF NOT EXISTS idx_students_est_connecte ON students(est_connecte);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_students_niveau_connecte ON students(niveau_actuel, est_connecte);
CREATE INDEX IF NOT EXISTS idx_students_niveau_scolaire_actuel ON students(niveau_scolaire, niveau_actuel);
CREATE INDEX IF NOT EXISTS idx_students_created_updated ON students(created_at, updated_at);

-- Performance indexes for authentication
CREATE INDEX IF NOT EXISTS idx_students_failed_attempts ON students(failed_login_attempts, locked_until);
CREATE INDEX IF NOT EXISTS idx_students_password_reset ON students(password_reset_token, password_reset_expires);

-- Analytics and reporting indexes
CREATE INDEX IF NOT EXISTS idx_students_total_points ON students(total_points DESC);
CREATE INDEX IF NOT EXISTS idx_students_serie_jours ON students(serie_jours DESC);
CREATE INDEX IF NOT EXISTS idx_students_mascotte_type ON students(mascotte_type);

-- =====================================================================================
-- EXERCISES TABLE INDEXES
-- =====================================================================================

-- Primary lookup indexes
CREATE INDEX IF NOT EXISTS idx_exercises_matiere ON exercises(matiere);
CREATE INDEX IF NOT EXISTS idx_exercises_niveau ON exercises(niveau);
CREATE INDEX IF NOT EXISTS idx_exercises_difficulte ON exercises(difficulte);
CREATE INDEX IF NOT EXISTS idx_exercises_competence_code ON exercises(competence_code);
CREATE INDEX IF NOT EXISTS idx_exercises_type_exercice ON exercises(type_exercice);
CREATE INDEX IF NOT EXISTS idx_exercises_est_actif ON exercises(est_actif);

-- Composite indexes for exercise filtering and selection
CREATE INDEX IF NOT EXISTS idx_exercises_matiere_niveau ON exercises(matiere, niveau, est_actif);
CREATE INDEX IF NOT EXISTS idx_exercises_niveau_difficulte ON exercises(niveau, difficulte, est_actif);
CREATE INDEX IF NOT EXISTS idx_exercises_competence_niveau ON exercises(competence_code, niveau, est_actif);
CREATE INDEX IF NOT EXISTS idx_exercises_matiere_competence ON exercises(matiere, competence_code, est_actif);

-- Performance indexes for exercise selection
CREATE INDEX IF NOT EXISTS idx_exercises_type_niveau ON exercises(type_exercice, niveau, est_actif);
CREATE INDEX IF NOT EXISTS idx_exercises_ordre_actif ON exercises(ordre, est_actif);
CREATE INDEX IF NOT EXISTS idx_exercises_points_xp ON exercises(points_recompense, xp);

-- Time-based indexes for content management
CREATE INDEX IF NOT EXISTS idx_exercises_created_updated ON exercises(created_at, updated_at);
CREATE INDEX IF NOT EXISTS idx_exercises_temps_estime ON exercises(temps_estime);

-- =====================================================================================
-- STUDENT PROGRESS TABLE INDEXES
-- =====================================================================================

-- Primary relationship indexes
CREATE INDEX IF NOT EXISTS idx_progress_student_id ON student_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_progress_exercise_id ON student_progress(exercise_id);
CREATE INDEX IF NOT EXISTS idx_progress_competence_code ON student_progress(competence_code);

-- Composite indexes for progress tracking
CREATE INDEX IF NOT EXISTS idx_progress_student_exercise ON student_progress(student_id, exercise_id);
CREATE INDEX IF NOT EXISTS idx_progress_student_competence ON student_progress(student_id, competence_code);
CREATE INDEX IF NOT EXISTS idx_progress_student_mastery ON student_progress(student_id, mastery_level);

-- Performance indexes for progress analytics
CREATE INDEX IF NOT EXISTS idx_progress_mastery_level ON student_progress(mastery_level);
CREATE INDEX IF NOT EXISTS idx_progress_needs_review ON student_progress(needs_review, review_scheduled_at);
CREATE INDEX IF NOT EXISTS idx_progress_completed ON student_progress(completed, completed_at);

-- Time-based indexes for scheduling and reporting
CREATE INDEX IF NOT EXISTS idx_progress_last_attempt ON student_progress(last_attempt_at);
CREATE INDEX IF NOT EXISTS idx_progress_mastered_at ON student_progress(mastered_at);
CREATE INDEX IF NOT EXISTS idx_progress_created_updated ON student_progress(created_at, updated_at);

-- Advanced composite indexes for complex queries
CREATE INDEX IF NOT EXISTS idx_progress_student_competence_mastery ON student_progress(student_id, competence_code, mastery_level);
CREATE INDEX IF NOT EXISTS idx_progress_exercise_mastery_time ON student_progress(exercise_id, mastery_level, last_attempt_at);

-- Performance indexes for statistics
CREATE INDEX IF NOT EXISTS idx_progress_scores ON student_progress(average_score, best_score);
CREATE INDEX IF NOT EXISTS idx_progress_attempts ON student_progress(total_attempts, successful_attempts);
CREATE INDEX IF NOT EXISTS idx_progress_streak ON student_progress(streak_count);

-- =====================================================================================
-- STUDENT LEARNING PATH TABLE INDEXES
-- =====================================================================================

-- Primary lookup indexes
CREATE INDEX IF NOT EXISTS idx_learning_path_student_id ON student_learning_path(student_id);
CREATE INDEX IF NOT EXISTS idx_learning_path_competence ON student_learning_path(competence_code);
CREATE INDEX IF NOT EXISTS idx_learning_path_status ON student_learning_path(status);
CREATE INDEX IF NOT EXISTS idx_learning_path_priority ON student_learning_path(priority);

-- Composite indexes for path management
CREATE INDEX IF NOT EXISTS idx_learning_path_student_competence ON student_learning_path(student_id, competence_code);
CREATE INDEX IF NOT EXISTS idx_learning_path_student_status ON student_learning_path(student_id, status);
CREATE INDEX IF NOT EXISTS idx_learning_path_student_priority ON student_learning_path(student_id, priority, personalized_order);

-- Progress tracking indexes
CREATE INDEX IF NOT EXISTS idx_learning_path_levels ON student_learning_path(current_level, target_level);
CREATE INDEX IF NOT EXISTS idx_learning_path_blocked ON student_learning_path(is_blocked, unlocked_at);
CREATE INDEX IF NOT EXISTS idx_learning_path_order ON student_learning_path(personalized_order);

-- =====================================================================================
-- SESSIONS TABLE INDEXES
-- =====================================================================================

-- Primary lookup indexes
CREATE INDEX IF NOT EXISTS idx_sessions_student_id ON sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at);

-- Composite indexes for session management
CREATE INDEX IF NOT EXISTS idx_sessions_student_expires ON sessions(student_id, expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_active ON sessions(expires_at, created_at);

-- =====================================================================================
-- REVISIONS TABLE INDEXES
-- =====================================================================================

-- Primary lookup indexes
CREATE INDEX IF NOT EXISTS idx_revisions_student_id ON revisions(student_id);
CREATE INDEX IF NOT EXISTS idx_revisions_exercise_id ON revisions(exercise_id);
CREATE INDEX IF NOT EXISTS idx_revisions_date ON revisions(revision_date);

-- Composite indexes for revision scheduling
CREATE INDEX IF NOT EXISTS idx_revisions_student_date ON revisions(student_id, revision_date);
CREATE INDEX IF NOT EXISTS idx_revisions_exercise_date ON revisions(exercise_id, revision_date);
CREATE INDEX IF NOT EXISTS idx_revisions_student_exercise ON revisions(student_id, exercise_id, revision_date);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_revisions_score ON revisions(score);
CREATE INDEX IF NOT EXISTS idx_revisions_created ON revisions(created_at);

-- =====================================================================================
-- MODULES TABLE INDEXES
-- =====================================================================================

-- Primary lookup indexes
CREATE INDEX IF NOT EXISTS idx_modules_matiere ON modules(matiere);
CREATE INDEX IF NOT EXISTS idx_modules_niveau ON modules(niveau);
CREATE INDEX IF NOT EXISTS idx_modules_est_actif ON modules(est_actif);

-- Composite indexes for module organization
CREATE INDEX IF NOT EXISTS idx_modules_matiere_niveau ON modules(matiere, niveau, est_actif);
CREATE INDEX IF NOT EXISTS idx_modules_ordre_actif ON modules(ordre, est_actif);

-- Time-based indexes
CREATE INDEX IF NOT EXISTS idx_modules_created_updated ON modules(created_at, updated_at);

-- =====================================================================================
-- GDPR TABLES INDEXES
-- =====================================================================================

-- GDPR Files indexes
CREATE INDEX IF NOT EXISTS idx_gdpr_files_student_id ON gdpr_files(student_id);
CREATE INDEX IF NOT EXISTS idx_gdpr_files_type ON gdpr_files(file_type);
CREATE INDEX IF NOT EXISTS idx_gdpr_files_created ON gdpr_files(created_at);
CREATE INDEX IF NOT EXISTS idx_gdpr_files_student_created ON gdpr_files(student_id, created_at);

-- GDPR Consent Requests indexes
CREATE INDEX IF NOT EXISTS idx_gdpr_consent_student_id ON gdpr_consent_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_gdpr_consent_type ON gdpr_consent_requests(consent_type);
CREATE INDEX IF NOT EXISTS idx_gdpr_consent_status ON gdpr_consent_requests(status);
CREATE INDEX IF NOT EXISTS idx_gdpr_consent_token ON gdpr_consent_requests(request_token);
CREATE INDEX IF NOT EXISTS idx_gdpr_consent_expires ON gdpr_consent_requests(expires_at);
CREATE INDEX IF NOT EXISTS idx_gdpr_consent_student_type ON gdpr_consent_requests(student_id, consent_type, status);

-- GDPR Data Processing Log indexes
CREATE INDEX IF NOT EXISTS idx_gdpr_log_student_id ON gdpr_data_processing_log(student_id);
CREATE INDEX IF NOT EXISTS idx_gdpr_log_action ON gdpr_data_processing_log(action);
CREATE INDEX IF NOT EXISTS idx_gdpr_log_data_type ON gdpr_data_processing_log(data_type);
CREATE INDEX IF NOT EXISTS idx_gdpr_log_created ON gdpr_data_processing_log(created_at);
CREATE INDEX IF NOT EXISTS idx_gdpr_log_student_action ON gdpr_data_processing_log(student_id, action, created_at);

-- =====================================================================================
-- FILES TABLE INDEXES
-- =====================================================================================

-- Primary lookup indexes
CREATE INDEX IF NOT EXISTS idx_files_filename ON files(filename);
CREATE INDEX IF NOT EXISTS idx_files_status ON files(status);
CREATE INDEX IF NOT EXISTS idx_files_category ON files(category);
CREATE INDEX IF NOT EXISTS idx_files_is_public ON files(is_public);
CREATE INDEX IF NOT EXISTS idx_files_uploaded_by ON files(uploaded_by);

-- Composite indexes for file management
CREATE INDEX IF NOT EXISTS idx_files_category_status ON files(category, status);
CREATE INDEX IF NOT EXISTS idx_files_public_category ON files(is_public, category, status);
CREATE INDEX IF NOT EXISTS idx_files_uploader_date ON files(uploaded_by, uploaded_at);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_files_size ON files(size);
CREATE INDEX IF NOT EXISTS idx_files_mime_type ON files(mime_type);
CREATE INDEX IF NOT EXISTS idx_files_uploaded_created ON files(uploaded_at, created_at);
CREATE INDEX IF NOT EXISTS idx_files_checksum ON files(checksum);

-- File Variants indexes
CREATE INDEX IF NOT EXISTS idx_file_variants_file_id ON file_variants(file_id);
CREATE INDEX IF NOT EXISTS idx_file_variants_variant ON file_variants(variant);
CREATE INDEX IF NOT EXISTS idx_file_variants_type ON file_variants(type);
CREATE INDEX IF NOT EXISTS idx_file_variants_deleted ON file_variants(deleted_at);
CREATE INDEX IF NOT EXISTS idx_file_variants_file_variant ON file_variants(file_id, variant, deleted_at);

-- =====================================================================================
-- COVERING INDEXES FOR FREQUENTLY ACCESSED DATA
-- =====================================================================================

-- Student summary covering index (includes most frequently accessed student fields)
CREATE INDEX IF NOT EXISTS idx_students_summary_covering ON students(
    id, prenom, nom, niveau_actuel, niveau_scolaire, total_points, 
    serie_jours, mascotte_type, derniere_acces, est_connecte
);

-- Exercise listing covering index
CREATE INDEX IF NOT EXISTS idx_exercises_listing_covering ON exercises(
    id, titre, matiere, niveau, difficulte, competence_code, 
    type_exercice, points_recompense, xp, est_actif, ordre
);

-- Progress summary covering index
CREATE INDEX IF NOT EXISTS idx_progress_summary_covering ON student_progress(
    student_id, exercise_id, competence_code, mastery_level, 
    progress_percent, best_score, completed, last_attempt_at
);

-- =====================================================================================
-- FULL-TEXT SEARCH INDEXES
-- =====================================================================================

-- Full-text search for exercises (titles and descriptions)
ALTER TABLE exercises ADD FULLTEXT(titre, description);

-- Full-text search for student names
ALTER TABLE students ADD FULLTEXT(prenom, nom);

-- =====================================================================================
-- PARTITIONING PREPARATION (Future Enhancement)
-- =====================================================================================

-- Note: These commands prepare the tables for future partitioning
-- They will be implemented in a future migration when data volume grows

-- Example partitioning strategy for student_progress by date
-- ALTER TABLE student_progress PARTITION BY RANGE (YEAR(created_at)) (
--     PARTITION p2024 VALUES LESS THAN (2025),
--     PARTITION p2025 VALUES LESS THAN (2026),
--     PARTITION p_future VALUES LESS THAN MAXVALUE
-- );

-- =====================================================================================
-- INDEX STATISTICS AND MONITORING
-- =====================================================================================

-- Create a view for monitoring index usage
CREATE OR REPLACE VIEW v_index_usage_stats AS
SELECT 
    TABLE_SCHEMA as database_name,
    TABLE_NAME as table_name,
    INDEX_NAME as index_name,
    SEQ_IN_INDEX as sequence_in_index,
    COLUMN_NAME as column_name,
    CARDINALITY as cardinality,
    INDEX_TYPE as index_type,
    COMMENT as comment
FROM information_schema.STATISTICS 
WHERE TABLE_SCHEMA = 'reved_kids'
    AND TABLE_NAME NOT LIKE 'v_%'  -- Exclude views
ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX;

-- Create a view for monitoring table statistics
CREATE OR REPLACE VIEW v_table_stats AS
SELECT 
    TABLE_NAME as table_name,
    TABLE_ROWS as estimated_rows,
    AVG_ROW_LENGTH as avg_row_length,
    DATA_LENGTH as data_length,
    INDEX_LENGTH as index_length,
    (DATA_LENGTH + INDEX_LENGTH) as total_size,
    AUTO_INCREMENT as next_auto_increment,
    CREATE_TIME as created_at,
    UPDATE_TIME as last_updated,
    CHECK_TIME as last_checked,
    TABLE_COMMENT as comment
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = 'reved_kids'
    AND TABLE_TYPE = 'BASE TABLE'
ORDER BY (DATA_LENGTH + INDEX_LENGTH) DESC;

-- =====================================================================================
-- MAINTENANCE PROCEDURES
-- =====================================================================================

-- Procedure to analyze table statistics
DELIMITER //
CREATE OR REPLACE PROCEDURE sp_analyze_all_tables()
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE table_name VARCHAR(128);
    DECLARE cur CURSOR FOR 
        SELECT TABLE_NAME 
        FROM information_schema.TABLES 
        WHERE TABLE_SCHEMA = 'reved_kids' AND TABLE_TYPE = 'BASE TABLE';
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

    OPEN cur;
    
    read_loop: LOOP
        FETCH cur INTO table_name;
        IF done THEN
            LEAVE read_loop;
        END IF;
        
        SET @sql = CONCAT('ANALYZE TABLE `', table_name, '`');
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END LOOP;
    
    CLOSE cur;
END //
DELIMITER ;

-- Procedure to optimize all tables
DELIMITER //
CREATE OR REPLACE PROCEDURE sp_optimize_all_tables()
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE table_name VARCHAR(128);
    DECLARE cur CURSOR FOR 
        SELECT TABLE_NAME 
        FROM information_schema.TABLES 
        WHERE TABLE_SCHEMA = 'reved_kids' AND TABLE_TYPE = 'BASE TABLE';
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

    OPEN cur;
    
    read_loop: LOOP
        FETCH cur INTO table_name;
        IF done THEN
            LEAVE read_loop;
        END IF;
        
        SET @sql = CONCAT('OPTIMIZE TABLE `', table_name, '`');
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END LOOP;
    
    CLOSE cur;
END //
DELIMITER ;

-- =====================================================================================
-- PERFORMANCE MONITORING QUERIES
-- =====================================================================================

-- Create a view for slow query identification
CREATE OR REPLACE VIEW v_performance_recommendations AS
SELECT 
    'INDEX_USAGE' as recommendation_type,
    CONCAT('Consider reviewing index usage for table: ', TABLE_NAME) as recommendation,
    TABLE_NAME as affected_table,
    ROUND((INDEX_LENGTH / (DATA_LENGTH + INDEX_LENGTH)) * 100, 2) as index_ratio_percent
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = 'reved_kids'
    AND TABLE_TYPE = 'BASE TABLE'
    AND (DATA_LENGTH + INDEX_LENGTH) > 0
    AND (INDEX_LENGTH / (DATA_LENGTH + INDEX_LENGTH)) > 0.5

UNION ALL

SELECT 
    'TABLE_SIZE' as recommendation_type,
    CONCAT('Large table detected: ', TABLE_NAME, ' - Consider archiving or partitioning') as recommendation,
    TABLE_NAME as affected_table,
    ROUND((DATA_LENGTH + INDEX_LENGTH) / (1024 * 1024), 2) as size_mb
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = 'reved_kids'
    AND TABLE_TYPE = 'BASE TABLE'
    AND (DATA_LENGTH + INDEX_LENGTH) > 100 * 1024 * 1024  -- > 100MB

ORDER BY recommendation_type, affected_table;

-- =====================================================================================
-- COMPLETION MESSAGE
-- =====================================================================================

SELECT 'Database indexing optimization completed successfully!' as status,
       NOW() as completed_at,
       'All indexes created for optimal query performance' as message;