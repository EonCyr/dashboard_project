-- db_init/init.sql

-- Create a table for dashboard metrics
CREATE TABLE IF NOT EXISTS metrics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    value INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Dummy data for our testing
INSERT INTO metrics (name, value) VALUES ('Active Users', 1250);
INSERT INTO metrics (name, value) VALUES ('Server Load', 45);

-- Table for users
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL, -- In production, always use hashed passwords!
    role ENUM('parent', 'tutor') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for students
CREATE TABLE IF NOT EXISTS students (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    student_id VARCHAR(50) NOT NULL UNIQUE,
    age INT NOT NULL,
    parent_username VARCHAR(50), 
    FOREIGN KEY (parent_username) REFERENCES users(username)
);

CREATE TABLE IF NOT EXISTS student_scores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id VARCHAR(50),
    vocab_band VARCHAR(10),
    phonics_band VARCHAR(10),
    writing_band VARCHAR(10),
    listening_band VARCHAR(10),
    overall_band VARCHAR(10),
    FOREIGN KEY (student_id) REFERENCES students(student_id)
);

-- Insert dummy users for testing
INSERT IGNORE INTO users (username, password, role) VALUES 
('Travis', 'password123', 'parent'),
('Tutor1', 'password123', 'tutor');

-- Dummy data for students
INSERT IGNORE INTO students (name, student_id, age, parent_username) VALUES 
('Alice', '001', 6, 'Travis'),
('Bob', '002', 7, NULL),
('Charlie', '003', 8, NULL);

-- Insert performance metrics for the students
INSERT INTO student_scores (student_id, vocab_band, phonics_band, writing_band, listening_band, overall_band) VALUES 
('001', 'A+', 'A', 'A', 'A-', 'A'),
('002', 'B+', 'C', 'B', 'C+', 'C'),
('003', 'B-', 'B', 'C', 'B-', 'B-');

-- For Communications
CREATE TABLE IF NOT EXISTS communications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id VARCHAR(50) NOT NULL,
    sender_username VARCHAR(50) NOT NULL,
    sender_role ENUM('parent', 'tutor') NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(student_id),
    FOREIGN KEY (sender_username) REFERENCES users(username)
);

CREATE INDEX idx_comm_student ON communications(student_id);