-- RATU MIS -- database schema (MySQL / MariaDB, matches XAMPP's bundled server)
-- Roles map directly to the RATU network's VLANs: admin(10), finance(20), academic(30), student(40)

CREATE TABLE users (
    id                   CHAR(36) PRIMARY KEY,
    email                VARCHAR(255) UNIQUE NOT NULL,
    password_hash        VARCHAR(255) NOT NULL,
    full_name            VARCHAR(255) NOT NULL,
    registration_number  VARCHAR(50) UNIQUE NULL,
    department           VARCHAR(100) NULL,
    role                 ENUM('student','academic','finance','admin') NOT NULL,
    campus               VARCHAR(50) NOT NULL DEFAULT 'Kigali',
    created_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE courses (
    id                   CHAR(36) PRIMARY KEY,
    code                 VARCHAR(20) UNIQUE NOT NULL,
    title                VARCHAR(255) NOT NULL,
    department           VARCHAR(100),
    credits              INT NOT NULL DEFAULT 3,
    lecturer_id          CHAR(36) NULL,
    enrollment_deadline  TIMESTAMP NULL,
    enrollment_semester  VARCHAR(20) NULL,
    created_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lecturer_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE enrollments (
    id          CHAR(36) PRIMARY KEY,
    student_id  CHAR(36) NOT NULL,
    course_id   CHAR(36) NOT NULL,
    semester    VARCHAR(20) NOT NULL,
    status      ENUM('active','completed','dropped') NOT NULL DEFAULT 'active',
    enrolled_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_enrollment (student_id, course_id, semester),
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE grades (
    id             CHAR(36) PRIMARY KEY,
    enrollment_id  CHAR(36) UNIQUE NOT NULL,
    score          DECIMAL(5,2),
    letter         VARCHAR(2),
    submitted_by   CHAR(36) NULL,
    submitted_at   TIMESTAMP NULL,
    FOREIGN KEY (enrollment_id) REFERENCES enrollments(id) ON DELETE CASCADE,
    FOREIGN KEY (submitted_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE announcements (
    id         CHAR(36) PRIMARY KEY,
    course_id  CHAR(36) NULL,
    author_id  CHAR(36) NOT NULL,
    content    TEXT NOT NULL,
    posted_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE admissions (
    id               CHAR(36) PRIMARY KEY,
    applicant_name   VARCHAR(255) NOT NULL,
    applicant_email  VARCHAR(255) NOT NULL,
    program          VARCHAR(255) NOT NULL,
    status           ENUM('pending','accepted','rejected') NOT NULL DEFAULT 'pending',
    reviewed_by      CHAR(36) NULL,
    submitted_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE invoices (
    id          CHAR(36) PRIMARY KEY,
    student_id  CHAR(36) NOT NULL,
    amount      DECIMAL(10,2) NOT NULL,
    description VARCHAR(255),
    status      ENUM('unpaid','paid','overdue') NOT NULL DEFAULT 'unpaid',
    due_date    DATE,
    paid_at     TIMESTAMP NULL,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_enrollments_student ON enrollments(student_id);
CREATE INDEX idx_enrollments_course ON enrollments(course_id);
CREATE INDEX idx_invoices_student ON invoices(student_id);
CREATE INDEX idx_courses_lecturer ON courses(lecturer_id);
CREATE INDEX idx_announcements_course ON announcements(course_id);
