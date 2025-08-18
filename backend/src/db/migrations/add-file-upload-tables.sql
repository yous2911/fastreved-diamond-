-- File Upload System Tables Migration
-- This migration adds tables for secure file upload functionality

-- Files table
CREATE TABLE IF NOT EXISTS files (
    id TEXT PRIMARY KEY,
    original_name TEXT NOT NULL,
    filename TEXT NOT NULL,
    mimetype TEXT NOT NULL,
    size INTEGER NOT NULL,
    path TEXT NOT NULL,
    url TEXT NOT NULL,
    thumbnail_url TEXT,
    metadata TEXT, -- JSON
    uploaded_by TEXT NOT NULL,
    uploaded_at TEXT NOT NULL,
    category TEXT NOT NULL, -- image, video, audio, document, etc.
    is_public INTEGER DEFAULT 0, -- boolean
    status TEXT NOT NULL, -- uploading, processing, ready, failed, deleted, quarantined
    checksum TEXT NOT NULL,
    deleted_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- File variants table (thumbnails, compressed versions, etc.)
CREATE TABLE IF NOT EXISTS file_variants (
    id TEXT PRIMARY KEY,
    file_id TEXT NOT NULL REFERENCES files(id),
    type TEXT NOT NULL, -- thumbnail, small, medium, large, compressed, watermarked
    filename TEXT NOT NULL,
    path TEXT NOT NULL,
    url TEXT NOT NULL,
    size INTEGER NOT NULL,
    mimetype TEXT NOT NULL,
    metadata TEXT, -- JSON
    created_at TEXT NOT NULL,
    deleted_at TEXT
);

-- File access logs table
CREATE TABLE IF NOT EXISTS file_access_logs (
    id TEXT PRIMARY KEY,
    file_id TEXT NOT NULL REFERENCES files(id),
    user_id TEXT,
    student_id INTEGER REFERENCES students(id),
    action TEXT NOT NULL, -- view, download, share, delete
    ip_address TEXT,
    user_agent TEXT,
    timestamp TEXT NOT NULL,
    details TEXT -- JSON
);

-- Security scan results table
CREATE TABLE IF NOT EXISTS security_scans (
    id TEXT PRIMARY KEY,
    file_id TEXT NOT NULL REFERENCES files(id),
    scan_engine TEXT NOT NULL,
    scan_date TEXT NOT NULL,
    is_clean INTEGER NOT NULL, -- boolean
    threats TEXT, -- JSON array
    quarantined INTEGER DEFAULT 0, -- boolean
    details TEXT -- JSON
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_files_uploaded_by ON files(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_files_category ON files(category);
CREATE INDEX IF NOT EXISTS idx_files_status ON files(status);
CREATE INDEX IF NOT EXISTS idx_files_checksum ON files(checksum);
CREATE INDEX IF NOT EXISTS idx_files_uploaded_at ON files(uploaded_at);
CREATE INDEX IF NOT EXISTS idx_files_is_public ON files(is_public);

CREATE INDEX IF NOT EXISTS idx_file_variants_file_id ON file_variants(file_id);
CREATE INDEX IF NOT EXISTS idx_file_variants_type ON file_variants(type);

CREATE INDEX IF NOT EXISTS idx_file_access_logs_file_id ON file_access_logs(file_id);
CREATE INDEX IF NOT EXISTS idx_file_access_logs_user_id ON file_access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_file_access_logs_timestamp ON file_access_logs(timestamp);

CREATE INDEX IF NOT EXISTS idx_security_scans_file_id ON security_scans(file_id);
CREATE INDEX IF NOT EXISTS idx_security_scans_is_clean ON security_scans(is_clean);
CREATE INDEX IF NOT EXISTS idx_security_scans_scan_date ON security_scans(scan_date);

-- Create triggers for automatic timestamp updates
CREATE TRIGGER IF NOT EXISTS update_files_updated_at 
    AFTER UPDATE ON files
    BEGIN
        UPDATE files SET updated_at = datetime('now') WHERE id = NEW.id;
    END;

-- Insert initial data retention policy for uploaded files
INSERT OR IGNORE INTO retention_policies (
    id,
    policy_name,
    entity_type,
    retention_period_days,
    trigger_condition,
    action,
    priority,
    active,
    legal_basis,
    exceptions,
    notification_days,
    created_at,
    updated_at
) VALUES (
    'file-retention-policy',
    'Uploaded Files Retention',
    'files',
    1095, -- 3 years
    'last_access_date',
    'delete',
    'medium',
    1,
    'GDPR Article 5(1)(e) - Storage limitation',
    '["ongoing_legal_case", "educational_records"]',
    30,
    datetime('now'),
    datetime('now')
);

-- Insert GDPR consent type for file uploads
INSERT OR IGNORE INTO retention_policies (
    id,
    policy_name,
    entity_type,
    retention_period_days,
    trigger_condition,
    action,
    priority,
    active,
    legal_basis,
    exceptions,
    notification_days,
    created_at,
    updated_at
) VALUES (
    'file-variants-retention-policy',
    'File Variants Cleanup',
    'file_variants',
    365, -- 1 year
    'created_at',
    'delete',
    'low',
    1,
    'Storage optimization',
    '["current_thumbnails"]',
    7,
    datetime('now'),
    datetime('now')
);