-- CP2025 Enhanced Migration Script
-- Safely migrate existing database to include enhanced progress tracking, prerequisites, and analytics

-- =============================================================================
-- MIGRATION SAFETY CHECKS
-- =============================================================================

-- Check if enhanced tables already exist
SET @enhanced_tables_exist = (
    SELECT COUNT(*) FROM information_schema.tables 
    WHERE table_schema = DATABASE() 
    AND table_name IN ('student_competence_progress', 'competence_prerequisites', 'daily_learning_analytics')
);

-- Only proceed if enhanced tables don't exist
-- This prevents accidental re-migration

-- =============================================================================
-- BACKUP EXISTING DATA (OPTIONAL BUT RECOMMENDED)
-- =============================================================================

-- Create backup tables with timestamp
SET @backup_suffix = DATE_FORMAT(NOW(), '%Y%m%d_%H%i%s');

-- Backup existing progress data if it exists
SET @sql = CONCAT('CREATE TABLE IF NOT EXISTS student_progress_backup_', @backup_suffix, ' AS SELECT * FROM student_progress');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =============================================================================
-- PHASE 1: CREATE ENHANCED TABLES
-- =============================================================================

-- Source the enhanced schema
SOURCE cp2025_enhanced_schema.sql;

-- =============================================================================
-- PHASE 2: MIGRATE EXISTING DATA
-- =============================================================================

-- Migrate existing student progress to enhanced tracking
-- This assumes you have a basic student_progress table
INSERT INTO student_competence_progress (
    student_id,
    competence_code,
    niveau,
    matiere, 
    domaine,
    mastery_level,
    progress_percent,
    total_attempts,
    successful_attempts,
    average_score,
    total_time_spent,
    first_attempt_at,
    last_attempt_at,
    created_at,
    updated_at
)
SELECT 
    sp.student_id,
    -- Extract competence code from exercise or module data
    COALESCE(e.competence_code, 'CP.FR.L1.1') as competence_code, -- Default fallback
    s.niveau_actuel as niveau,
    -- Map subject based on exercise type or use default
    CASE 
        WHEN e.type IN ('LECTURE', 'TEXT_INPUT') THEN 'FRANCAIS'
        WHEN e.type IN ('CALCUL', 'GEOMETRIE', 'PROBLEME') THEN 'MATHEMATIQUES'
        ELSE 'FRANCAIS'
    END as matiere,
    -- Extract domain from competence code or default
    SUBSTRING(COALESCE(e.competence_code, 'CP.FR.L1.1'), LOCATE('.', COALESCE(e.competence_code, 'CP.FR.L1.1'), LOCATE('.', COALESCE(e.competence_code, 'CP.FR.L1.1')) + 1) + 1, 2) as domaine,
    -- Map completion status to mastery level
    CASE 
        WHEN sp.completed = 1 AND sp.score >= 90 THEN 'mastered'
        WHEN sp.completed = 1 AND sp.score >= 75 THEN 'mastering'
        WHEN sp.completed = 1 THEN 'practicing'
        WHEN sp.attempts > 0 THEN 'discovering'
        ELSE 'not_started'
    END as mastery_level,
    -- Calculate progress percentage
    CASE 
        WHEN sp.completed = 1 THEN 100
        WHEN sp.attempts > 0 THEN GREATEST(sp.score, 25)
        ELSE 0
    END as progress_percent,
    sp.attempts as total_attempts,
    CASE WHEN sp.completed = 1 THEN sp.attempts ELSE FLOOR(sp.attempts * (sp.score / 100.0)) END as successful_attempts,
    sp.score as average_score,
    sp.time_spent as total_time_spent,
    sp.created_at as first_attempt_at,
    COALESCE(sp.completed_at, sp.updated_at) as last_attempt_at,
    sp.created_at,
    sp.updated_at
FROM student_progress sp
LEFT JOIN exercises e ON sp.exercise_id = e.id
LEFT JOIN students s ON sp.student_id = s.id
WHERE sp.student_id IS NOT NULL
ON DUPLICATE KEY UPDATE
    total_attempts = VALUES(total_attempts),
    successful_attempts = VALUES(successful_attempts),
    average_score = VALUES(average_score),
    total_time_spent = VALUES(total_time_spent),
    updated_at = VALUES(updated_at);

-- =============================================================================
-- PHASE 3: GENERATE INITIAL ANALYTICS DATA
-- =============================================================================

-- Generate daily analytics from existing session data (if available)
-- This creates historical daily analytics based on existing progress data
INSERT INTO daily_learning_analytics (
    student_id,
    analytics_date,
    total_session_time,
    exercises_attempted,
    exercises_completed,
    average_score,
    xp_earned,
    created_at
)
SELECT 
    sp.student_id,
    DATE(sp.updated_at) as analytics_date,
    SUM(COALESCE(sp.time_spent, 300)) as total_session_time, -- Default 5 min if null
    COUNT(sp.id) as exercises_attempted,
    SUM(CASE WHEN sp.completed = 1 THEN 1 ELSE 0 END) as exercises_completed,
    AVG(COALESCE(sp.score, 0)) as average_score,
    SUM(CASE WHEN sp.completed = 1 THEN COALESCE(e.xp, 10) ELSE 0 END) as xp_earned,
    MIN(sp.created_at) as created_at
FROM student_progress sp
LEFT JOIN exercises e ON sp.exercise_id = e.id
WHERE sp.updated_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) -- Last 30 days
GROUP BY sp.student_id, DATE(sp.updated_at)
HAVING COUNT(sp.id) > 0
ON DUPLICATE KEY UPDATE
    total_session_time = VALUES(total_session_time),
    exercises_attempted = VALUES(exercises_attempted),
    exercises_completed = VALUES(exercises_completed),
    average_score = VALUES(average_score),
    xp_earned = VALUES(xp_earned);

-- Generate initial learning paths for all students
INSERT INTO student_learning_path (
    student_id,
    competence_code,
    status,
    priority,
    recommended_difficulty,
    estimated_completion_time,
    personalized_order,
    is_blocked,
    created_at,
    updated_at
)
SELECT DISTINCT
    s.id as student_id,
    cc.code as competence_code,
    CASE 
        WHEN scp.mastery_level = 'mastered' THEN 'completed'
        WHEN scp.mastery_level IN ('mastering', 'practicing') THEN 'in_progress'
        WHEN EXISTS (
            SELECT 1 FROM competence_prerequisites cp 
            WHERE cp.competence_code = cc.code 
            AND cp.prerequisite_code NOT IN (
                SELECT scp2.competence_code 
                FROM student_competence_progress scp2 
                WHERE scp2.student_id = s.id 
                AND scp2.mastery_level = 'mastered'
            )
        ) THEN 'locked'
        ELSE 'available'
    END as status,
    'normal' as priority,
    CASE 
        WHEN cc.niveau = s.niveau_actuel THEN 'entrainement'
        ELSE 'decouverte'
    END as recommended_difficulty,
    CASE 
        WHEN cc.matiere = 'FRANCAIS' THEN 45
        WHEN cc.matiere = 'MATHEMATIQUES' THEN 35
        ELSE 30
    END as estimated_completion_time,
    ROW_NUMBER() OVER (PARTITION BY s.id, cc.niveau, cc.matiere ORDER BY cc.domaine, cc.numero, cc.competence) as personalized_order,
    EXISTS (
        SELECT 1 FROM competence_prerequisites cp 
        WHERE cp.competence_code = cc.code 
        AND cp.prerequisite_type = 'required'
        AND cp.prerequisite_code NOT IN (
            SELECT scp2.competence_code 
            FROM student_competence_progress scp2 
            WHERE scp2.student_id = s.id 
            AND scp2.mastery_level = 'mastered'
        )
    ) as is_blocked,
    NOW() as created_at,
    NOW() as updated_at
FROM students s
CROSS JOIN cp2025_competence_codes cc
LEFT JOIN student_competence_progress scp ON s.id = scp.student_id AND cc.code = scp.competence_code
WHERE cc.niveau IN (s.niveau_actuel, 'CP-CE1') -- Include transition competences
ON DUPLICATE KEY UPDATE
    status = VALUES(status),
    is_blocked = VALUES(is_blocked),
    updated_at = VALUES(updated_at);

-- =============================================================================
-- PHASE 4: POPULATE SAMPLE PREREQUISITES
-- =============================================================================

-- Source the sample data (this will populate prerequisites and sample analytics)
SOURCE populate_cp2025_enhanced_data.sql;

-- =============================================================================
-- PHASE 5: CREATE WEEKLY SUMMARIES FROM DAILY DATA
-- =============================================================================

-- Generate weekly summaries from daily analytics
INSERT INTO weekly_progress_summary (
    student_id,
    week_start_date,
    week_end_date,
    week_of_year,
    year_number,
    total_learning_time,
    total_exercises,
    total_xp_earned,
    competences_mastered,
    average_score,
    francais_progress,
    mathematiques_progress,
    weekly_goal_met,
    created_at
)
SELECT 
    dla.student_id,
    DATE_SUB(dla.analytics_date, INTERVAL WEEKDAY(dla.analytics_date) DAY) as week_start_date,
    DATE_ADD(DATE_SUB(dla.analytics_date, INTERVAL WEEKDAY(dla.analytics_date) DAY), INTERVAL 6 DAY) as week_end_date,
    WEEK(dla.analytics_date, 1) as week_of_year,
    YEAR(dla.analytics_date) as year_number,
    SUM(dla.total_session_time) as total_learning_time,
    SUM(dla.exercises_attempted) as total_exercises,
    SUM(dla.xp_earned) as total_xp_earned,
    SUM(dla.competences_mastered) as competences_mastered,
    AVG(dla.average_score) as average_score,
    (SUM(dla.francais_time) / NULLIF(SUM(dla.total_session_time), 0)) * 100 as francais_progress,
    (SUM(dla.mathematiques_time) / NULLIF(SUM(dla.total_session_time), 0)) * 100 as mathematiques_progress,
    SUM(dla.total_session_time) >= 1800 as weekly_goal_met, -- 30 minutes minimum
    MIN(dla.created_at) as created_at
FROM daily_learning_analytics dla
GROUP BY 
    dla.student_id, 
    YEAR(dla.analytics_date), 
    WEEK(dla.analytics_date, 1)
ON DUPLICATE KEY UPDATE
    total_learning_time = VALUES(total_learning_time),
    total_exercises = VALUES(total_exercises),
    total_xp_earned = VALUES(total_xp_earned),
    competences_mastered = VALUES(competences_mastered),
    average_score = VALUES(average_score),
    francais_progress = VALUES(francais_progress),
    mathematiques_progress = VALUES(mathematiques_progress),
    weekly_goal_met = VALUES(weekly_goal_met);

-- =============================================================================
-- PHASE 6: VALIDATION AND CLEANUP
-- =============================================================================

-- Validate the migration
SET @student_count = (SELECT COUNT(*) FROM students);
SET @progress_count = (SELECT COUNT(*) FROM student_competence_progress);
SET @analytics_count = (SELECT COUNT(*) FROM daily_learning_analytics);
SET @prerequisites_count = (SELECT COUNT(*) FROM competence_prerequisites);

-- Output migration summary
SELECT 
    'Migration Summary' as info,
    @student_count as total_students,
    @progress_count as progress_records,
    @analytics_count as daily_analytics_records,
    @prerequisites_count as prerequisite_relationships;

-- Check for any orphaned records
SELECT 
    'Orphaned Progress Records' as check_type,
    COUNT(*) as count
FROM student_competence_progress scp
LEFT JOIN students s ON scp.student_id = s.id
WHERE s.id IS NULL

UNION ALL

SELECT 
    'Invalid Competence Codes' as check_type,
    COUNT(*) as count
FROM student_competence_progress scp
LEFT JOIN cp2025_competence_codes cc ON scp.competence_code = cc.code
WHERE cc.code IS NULL;

-- =============================================================================
-- POST-MIGRATION OPTIMIZATIONS
-- =============================================================================

-- Update table statistics
ANALYZE TABLE student_competence_progress, competence_prerequisites, daily_learning_analytics, 
            weekly_progress_summary, student_learning_path, student_achievements;

-- Optimize tables
OPTIMIZE TABLE student_competence_progress, competence_prerequisites, daily_learning_analytics,
              weekly_progress_summary, student_learning_path, student_achievements;

-- =============================================================================
-- FINAL VERIFICATION QUERIES
-- =============================================================================

-- Verify prerequisite chain integrity (no circular dependencies)
SELECT 
    'Prerequisite Validation' as check_type,
    CASE 
        WHEN EXISTS (
            WITH RECURSIVE prereq_check AS (
                SELECT competence_code, prerequisite_code, 1 as level
                FROM competence_prerequisites
                
                UNION ALL
                
                SELECT pc.competence_code, cp.prerequisite_code, pc.level + 1
                FROM prereq_check pc
                JOIN competence_prerequisites cp ON pc.prerequisite_code = cp.competence_code
                WHERE pc.level < 10
            )
            SELECT 1 FROM prereq_check pc
            JOIN competence_prerequisites cp ON pc.competence_code = cp.prerequisite_code 
                AND pc.prerequisite_code = cp.competence_code
        ) THEN 'CIRCULAR_DEPENDENCY_DETECTED'
        ELSE 'OK'
    END as status;

-- Check data consistency
SELECT 
    'Data Consistency Check' as check_type,
    COUNT(*) as records_with_issues
FROM student_competence_progress
WHERE (successful_attempts > total_attempts) 
   OR (progress_percent > 100) 
   OR (average_score > 100)
   OR (mastery_level = 'mastered' AND progress_percent < 100);

-- Migration completed successfully message
SELECT 
    'MIGRATION COMPLETED' as status,
    NOW() as completed_at,
    'Enhanced CP2025 schema with progress tracking, prerequisites, and analytics has been successfully deployed.' as message;

-- =============================================================================
-- CLEANUP INSTRUCTIONS
-- =============================================================================

/*
OPTIONAL CLEANUP AFTER SUCCESSFUL MIGRATION:

-- Remove backup tables after verifying migration success
-- DROP TABLE student_progress_backup_YYYYMMDD_HHMMSS;

-- Update application configuration to use new tables
-- Update API endpoints to query enhanced tables
-- Update dashboard queries to use new analytics views

RECOMMENDED NEXT STEPS:

1. Update your application code to use the new enhanced tables
2. Create API endpoints for the new analytics data
3. Update your dashboard to display the new progress tracking
4. Set up scheduled jobs to maintain the analytics aggregations
5. Configure automated prerequisite unlocking logic
6. Implement achievement notification system

*/