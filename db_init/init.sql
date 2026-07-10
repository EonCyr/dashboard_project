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