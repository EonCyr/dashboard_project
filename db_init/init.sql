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
    studentid INT PRIMARY KEY,
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
    semester VARCHAR(20) NOT NULL,
    centre VARCHAR(100) NOT NULL,
    scores JSON,
    CONSTRAINT check_scores CHECK (JSON_SCHEMA_VALID(
            '{
                "type": "object",
                "properties": {
                    "vocab": { "type": "object" },
                    "pa/phonics": { "type": "object" },
                    "writing": { "type": "object" },
                    "listening/readingcomprehension": { "type": "object" }
                },
                "required": ["vocab", "pa/phonics", "writing", "listening/readingcomprehension"]
            }',
            scores
        )),
    band VARCHAR(10),
    FOREIGN KEY (studentid) REFERENCES students(studentid) ON DELETE CASCADE,
    CONSTRAINT unique_student_semester UNIQUE (studentid, semester) -- Testing this line
);


-- For Communications
CREATE TABLE IF NOT EXISTS communications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    studentid INT NOT NULL,
    parentid INT NOT NULL,
    sender_username VARCHAR(50) NOT NULL,
    sender_role ENUM('parent', 'therapist') NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (studentid) REFERENCES students(studentid),
    FOREIGN KEY (parentid) REFERENCES users(userid)
);
CREATE INDEX idx_comm_thread ON communications(studentid, parentid);



-- Dummy data for testing with the new schema
INSERT IGNORE INTO users (userid, username, password, email, phone_number, role) VALUES
(1, 'therapist1', 'pw123', 'therapist1@example.com', '11111111', 'therapist'),
(2, 'parent1', 'pw123', 'parent1@example.com', '22222222', 'parent'),
(3, 'parent2', 'pw123', 'parent2@example.com', '33333333', 'parent'),
(4, 'parent3', 'pw123', 'parent3@example.com', '44444444', 'parent');

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

-- INSERT IGNORE INTO assessments (assessmentid, therapistid, studentid, semester, centre, scores, band) VALUES
-- (1, 1, 1, '2022 Sem 1', 'centre1', '{"vocab":"A","pa/phonics":"B","writing":"A","listening/readingcomprehension":"A"}', 'A'),
-- (2, 1, 2, '2022 Sem 2', 'centre1', '{"vocab":"B","pa/phonics":"C","writing":"B","listening/readingcomprehension":"B"}', 'B'),
-- (3, 1, 3, '2023 Sem 1', 'centre1', '{"vocab":"C","pa/phonics":"B","writing":"C","listening/readingcomprehension":"B"}', 'B');


-- INSERT IGNORE INTO assessments (assessmentid, therapistid, studentid, semester, centre, scores, band) VALUES
-- (1, 1, 1, '2022 Sem 1', 'centre1',
--   '{"vocab":{"band":"B+","raw_score":78},"pa/phonics":{"band":"B","raw_score":72},"writing":{"band":"B","raw_score":70},"listening/readingcomprehension":{"band":"B-","raw_score":68}}',
--   'B'),
-- (2, 1, 1, '2022 Sem 2', 'centre1',
--   '{"vocab":{"band":"A-","raw_score":85},"pa/phonics":{"band":"A-","raw_score":83},"writing":{"band":"B+","raw_score":78},"listening/readingcomprehension":{"band":"B","raw_score":74}}',
--   'B+'),
-- (3, 1, 1, '2023 Sem 1', 'centre1',
--   '{"vocab":{"band":"A+","raw_score":95},"pa/phonics":{"band":"A","raw_score":90},"writing":{"band":"A","raw_score":88},"listening/readingcomprehension":{"band":"A-","raw_score":85}}',
--   'A'),
-- (4, 1, 2, '2022 Sem 1', 'centre1',
--   '{"vocab":{"band":"C","raw_score":55},"pa/phonics":{"band":"C-","raw_score":50},"writing":{"band":"C","raw_score":52},"listening/readingcomprehension":{"band":"D+","raw_score":45}}',
--   'C-'),
-- (5, 1, 2, '2022 Sem 2', 'centre1',
--   '{"vocab":{"band":"B","raw_score":68},"pa/phonics":{"band":"C+","raw_score":58},"writing":{"band":"B-","raw_score":60},"listening/readingcomprehension":{"band":"C","raw_score":52}}',
--   'C+'),
-- (6, 1, 3, '2023 Sem 1', 'centre1',
--   '{"vocab":{"band":"C+","raw_score":58},"pa/phonics":{"band":"C","raw_score":54},"writing":{"band":"D+","raw_score":45},"listening/readingcomprehension":{"band":"C","raw_score":52}}',
--   'C-');

-- hardcoded risk thresholds ignore first

CREATE TABLE IF NOT EXISTS Risk_Threshold_Configurations (
    Configuration_ID INT PRIMARY KEY AUTO_INCREMENT,
    Set_By_Teacher_ID INT NULL,
    Critical_Score_Ceiling INT NOT NULL DEFAULT 20,
    Moderate_Score_Ceiling INT NOT NULL DEFAULT 25,
    High_Performer_Benchmark INT NOT NULL DEFAULT 28,
    Baseline_Window_Months INT NOT NULL DEFAULT 2,
    Stagnant_Months_Threshold INT NOT NULL DEFAULT 3,
    Last_Updated DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO Risk_Threshold_Configurations 
(Configuration_ID, Critical_Score_Ceiling, Moderate_Score_Ceiling, High_Performer_Benchmark, Baseline_Window_Months)
VALUES (1, 20, 25, 28, 2)
ON DUPLICATE KEY UPDATE Configuration_ID=1;