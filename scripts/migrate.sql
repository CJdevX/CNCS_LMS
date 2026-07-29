-- ============================================================
-- CNCS LMS — Database Migration
-- Run this against your `cncs_lms` MySQL database
-- ============================================================

-- 1. Subjects (dynamic — can add new ones from the UI)
CREATE TABLE IF NOT EXISTS subjects (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed default subjects
INSERT IGNORE INTO subjects (name) VALUES
  ('Networking'),
  ('Cloud'),
  ('Security'),
  ('Programming'),
  ('Database'),
  ('Operating Systems');

-- 2. Core files table
--    category: top-level Drive folder  (Documents | Videos | Images | Assignments | Others)
--    type:     sub-folder under Docs   (PDF | Word | PowerPoint | Excel | Video | Image | Assignment | Other)
CREATE TABLE IF NOT EXISTS lms_files (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  drive_file_id VARCHAR(255)  NOT NULL,
  drive_url     VARCHAR(512),
  name          VARCHAR(255)  NOT NULL,
  category      ENUM('Documents','Videos','Images','Assignments','Others') NOT NULL,
  type          ENUM('PDF','Word','PowerPoint','Excel','Video','Image','Assignment','Other') NOT NULL,
  subject_id    INT,
  uploaded_by   VARCHAR(255),          -- Google email of uploader
  size_bytes    BIGINT DEFAULT 0,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL
);

-- 3. Person-wise access — teacher assigns files to specific students
CREATE TABLE IF NOT EXISTS file_access (
  file_id    INT          NOT NULL,
  user_email VARCHAR(255) NOT NULL,
  granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (file_id, user_email),
  FOREIGN KEY (file_id) REFERENCES lms_files(id) ON DELETE CASCADE
);

-- Indexes for fast filtering
CREATE INDEX idx_files_type       ON lms_files(type);
CREATE INDEX idx_files_category   ON lms_files(category);
CREATE INDEX idx_files_subject    ON lms_files(subject_id);
CREATE INDEX idx_files_uploader   ON lms_files(uploaded_by);
CREATE INDEX idx_access_email     ON file_access(user_email);
