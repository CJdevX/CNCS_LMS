-- ============================================================
-- CNCS LMS — Database Migration
-- Run this against your `cncs_lms` MySQL database
-- ============================================================

-- 1. Users table for friends login
CREATE TABLE IF NOT EXISTS users (
  id            INT PRIMARY KEY AUTO_INCREMENT,
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Subjects (dynamic — can add new ones from the UI)
CREATE TABLE IF NOT EXISTS subjects (
  id         INT PRIMARY KEY AUTO_INCREMENT,
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

-- 3. Core files table
CREATE TABLE IF NOT EXISTS lms_files (
  id            INT PRIMARY KEY AUTO_INCREMENT,
  drive_file_id VARCHAR(255)  NOT NULL,
  drive_url     VARCHAR(512),
  name          VARCHAR(255)  NOT NULL,
  category      ENUM('Documents','Videos','Images','Assignments','Others') NOT NULL,
  type          ENUM('PDF','Word','PowerPoint','Excel','Video','Image','Assignment','Other') NOT NULL,
  subject_id    INT,
  uploaded_by   VARCHAR(255),          -- Email of uploader
  size_bytes    BIGINT DEFAULT 0,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL
);

-- 4. Person-wise access
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
