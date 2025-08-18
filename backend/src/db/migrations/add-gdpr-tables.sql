-- Migration: Add GDPR compliance tables
-- Date: 2024-01-27

-- Files table for GDPR compliance and file uploads
CREATE TABLE IF NOT EXISTS files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  filename TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mimetype TEXT NOT NULL,
  size INTEGER NOT NULL,
  student_id INTEGER,
  path TEXT NOT NULL,
  uploaded_at TEXT NOT NULL,
  is_gdpr_protected INTEGER NOT NULL DEFAULT 1,
  retention_date TEXT,
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE SET NULL
);

-- GDPR Consent Requests table
CREATE TABLE IF NOT EXISTS gdpr_consent_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  request_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  request_token TEXT NOT NULL UNIQUE,
  parent_email TEXT NOT NULL,
  request_details TEXT NOT NULL DEFAULT '{}',
  processed_at TEXT,
  processed_by TEXT,
  expires_at TEXT NOT NULL,
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- Data Processing Log table for GDPR audit trail
CREATE TABLE IF NOT EXISTS gdpr_data_processing_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER,
  action TEXT NOT NULL,
  data_type TEXT NOT NULL,
  description TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  request_id TEXT,
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE SET NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS files_student_idx ON files(student_id);
CREATE INDEX IF NOT EXISTS files_filename_idx ON files(filename);
CREATE INDEX IF NOT EXISTS files_uploaded_at_idx ON files(uploaded_at);
CREATE INDEX IF NOT EXISTS files_retention_idx ON files(retention_date);

CREATE INDEX IF NOT EXISTS gdpr_consent_student_idx ON gdpr_consent_requests(student_id);
CREATE INDEX IF NOT EXISTS gdpr_consent_token_idx ON gdpr_consent_requests(request_token);
CREATE INDEX IF NOT EXISTS gdpr_consent_status_idx ON gdpr_consent_requests(status);
CREATE INDEX IF NOT EXISTS gdpr_consent_expires_idx ON gdpr_consent_requests(expires_at);

CREATE INDEX IF NOT EXISTS gdpr_log_student_idx ON gdpr_data_processing_log(student_id);
CREATE INDEX IF NOT EXISTS gdpr_log_action_idx ON gdpr_data_processing_log(action);
CREATE INDEX IF NOT EXISTS gdpr_log_date_idx ON gdpr_data_processing_log(created_at);
CREATE INDEX IF NOT EXISTS gdpr_log_data_type_idx ON gdpr_data_processing_log(data_type); 