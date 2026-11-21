-- Migration 002: registration numbers (for Excel-based grade matching)
-- and enrollment deadlines (for the self-enrollment countdown)

ALTER TABLE users
  ADD COLUMN registration_number VARCHAR(50) UNIQUE NULL AFTER full_name,
  ADD COLUMN department VARCHAR(100) NULL AFTER registration_number;

ALTER TABLE courses
  ADD COLUMN enrollment_deadline TIMESTAMP NULL AFTER credits,
  ADD COLUMN enrollment_semester VARCHAR(20) NULL AFTER enrollment_deadline;
