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

-- table for students
CREATE TABLE IF NOT EXISTS students (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    student_id VARCHAR(50) NOT NULL UNIQUE,
    age INT NOT NULL,
    band VARCHAR(50) NOT NULL,
    progress VARCHAR(50) DEFAULT 'Not Started'
);

-- Dummy data for students
INSERT IGNORE INTO students (name, student_id, age, band, progress) VALUES 
('Alice', '001', 6, 'A', 'On Track'),
('Bob', '002', 7, 'B', 'Needs Improvement'),
('Charlie', '003', 8, 'C', 'Needs Improvement');