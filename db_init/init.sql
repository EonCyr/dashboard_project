-- db_init/init.sql

CREATE TABLE IF NOT EXISTS users (
    userid INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(100) NOT NULL,
    phone_number VARCHAR(15) NOT NULL,
    role ENUM('parent', 'therapist') NOT NULL
);

CREATE TABLE IF NOT EXISTS therapists (
    userid INT PRIMARY KEY,
    centre VARCHAR(100) NOT NULL,
    FOREIGN KEY (userid) REFERENCES users(userid) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS parents (
    userid INT PRIMARY KEY,
    FOREIGN KEY (userid) REFERENCES users(userid) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS students (
    studentid INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    age INT NOT NULL,
    current_band VARCHAR(10) NOT NULL,
    date_of_enrollment DATE NOT NULL,
    centre VARCHAR(100) NOT NULL,
    school VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS student_profile (
    studentid INT PRIMARY KEY,
    date_of_birth DATE NOT NULL,
    school_level VARCHAR(50) NOT NULL,
    months_to_48 INT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (studentid) REFERENCES students(studentid) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS therapist_student (
    therapistid INT,
    studentid INT,
    PRIMARY KEY (therapistid, studentid),
    FOREIGN KEY (therapistid) REFERENCES users(userid) ON DELETE CASCADE,
    FOREIGN KEY (studentid) REFERENCES students(studentid) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS parent_student (
    parentid INT,
    studentid INT,
    relationship VARCHAR(50) NOT NULL,
    PRIMARY KEY (parentid, studentid),
    FOREIGN KEY (parentid) REFERENCES users(userid) ON DELETE CASCADE,
    FOREIGN KEY (studentid) REFERENCES students(studentid) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS assessments (
    assessmentid INT AUTO_INCREMENT PRIMARY KEY,
    therapistid INT,
    studentid INT,
    date_of_assessment DATE NOT NULL,
    centre VARCHAR(100) NOT NULL,
    scores JSON,
    CONSTRAINT check_scores CHECK (JSON_SCHEMA_VALID(
            '{
                "type": "object",
                "properties": {
                    "vocab": { "type": "string" },
                    "pa/phonics": { "type": "string" },
                    "writing": { "type": "string" },
                    "listening/readingcomprehension": { "type": "string" }
                },
                "required": ["vocab", "pa/phonics", "writing", "listening/readingcomprehension"]
            }',
            scores
        )),
    band VARCHAR(10),
    FOREIGN KEY (studentid) REFERENCES students(studentid) ON DELETE CASCADE
);

-- Dummy data for testing with the new schema
INSERT IGNORE INTO users (userid, username, password, email, phone_number, role) VALUES
(1, 'therapist1', 'password123', 'therapist1@example.com', '11111111', 'therapist'),
(2, 'parent1', 'password123', 'parent1@example.com', '22222222', 'parent'),
(3, 'parent2', 'password123', 'parent2@example.com', '33333333', 'parent'),
(4, 'parent3', 'password123', 'parent3@example.com', '44444444', 'parent');

INSERT IGNORE INTO therapists (userid, centre) VALUES
(1, 'centre1');

INSERT IGNORE INTO parents (userid) VALUES
(2),
(3),
(4);

INSERT IGNORE INTO students (studentid, name, age, current_band, date_of_enrollment, centre, school) VALUES
(1, 'Alice', 7, 'A', '2024-01-15', 'centre1', 'School1'),
(2, 'Bob', 8, 'B', '2024-02-01', 'centre1', 'School2'),
(3, 'Charlie', 6, 'C', '2024-03-10', 'centre1', 'School3');

INSERT IGNORE INTO student_profile (studentid, date_of_birth, school_level, months_to_48) VALUES
(1, '2019-05-01', 'Year 2', 18),
(2, '2018-11-12', 'Year 3', 24),
(3, '2020-02-20', 'Year 1', 12);

INSERT IGNORE INTO therapist_student (therapistid, studentid) VALUES
(1, 1),
(1, 2),
(1, 3);

INSERT IGNORE INTO parent_student (parentid, studentid, relationship) VALUES
(2, 1, 'Mother'),
(3, 2, 'Father'),
(4, 3, 'Guardian');

INSERT IGNORE INTO assessments (assessmentid, therapistid, studentid, date_of_assessment, centre, scores, band) VALUES
(1, 1, 1, '2026-06-01', 'centre1', '{"vocab":"A","pa/phonics":"B","writing":"A","listening/readingcomprehension":"A"}', 'A'),
(2, 1, 2, '2026-06-10', 'centre1', '{"vocab":"B","pa/phonics":"C","writing":"B","listening/readingcomprehension":"B"}', 'B'),
(3, 1, 3, '2026-06-15', 'centre1', '{"vocab":"C","pa/phonics":"B","writing":"C","listening/readingcomprehension":"B"}', 'B');