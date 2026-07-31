-- ============================================================
-- CNCS LMS — Database Migration
-- Run this against your `cncs_lms` MySQL database
-- ============================================================

-- 1. Users table for friends login
CREATE TABLE users (
  id            INT PRIMARY KEY AUTO_INCREMENT,
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Subjects (dynamic — can add new ones from the UI)
CREATE TABLE subjects (
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
CREATE TABLE lms_files (
  id              INT PRIMARY KEY AUTO_INCREMENT,
  drive_file_id   VARCHAR(255)  NOT NULL,
  drive_url       VARCHAR(512),
  name            VARCHAR(255)  NOT NULL,
  category        VARCHAR(100) NOT NULL,
  type            VARCHAR(10) NOT NULL,
  subject_id      INT,
  uploaded_by     VARCHAR(255),          -- Email of uploader
  size_bytes      BIGINT DEFAULT 0,
  storage_type    ENUM('GOOGLE_DRIVE','YOUTUBE') NOT NULL DEFAULT 'GOOGLE_DRIVE',
  google_drive_id VARCHAR(255),
  youtube_url     TEXT,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL
);

-- Indexes for fast filtering
CREATE INDEX idx_files_type       ON lms_files(type);
CREATE INDEX idx_files_category   ON lms_files(category);
CREATE INDEX idx_files_subject    ON lms_files(subject_id);
CREATE INDEX idx_files_uploader   ON lms_files(uploaded_by);
CREATE INDEX idx_files_storage    ON lms_files(storage_type);

