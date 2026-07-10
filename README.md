# Dashboard Project

This project is a full-stack web application designed to [insert a brief 1-sentence description of your project's goal, e.g., "monitor and visualize real-time system metrics"].

## Project Structure

```text
dashboard_project/
├── db_init/
│   └── init.sql           # Database schema and initial data
├── server/
│   ├── Dockerfile         # Node.js backend build instructions
│   ├── index.js           # Backend API and server logic
│   ├── package.json       # Backend dependencies
│   └── package-lock.json
├── client/
│   ├── Dockerfile         # Frontend build instructions
│   ├── src/
│   │   ├── assets/        # Static images or icons
│   │   ├── App.jsx        # Root component
│   │   ├── App.css        # Component-specific styles
│   │   ├── index.css      # Global styles
│   │   └── main.jsx       # Entry point for React
│   ├── index.html         # Base HTML for React
│   ├── package.json       # Frontend dependencies
│   └── vite.config.js     # Frontend build configuration
├── .env                   # Local configuration (Ignored by Git)
├── .env.example           # Template for environment variables
├── .gitignore             # Files to exclude from version control
└── docker-compose.yml     # Orchestration of all services

### Prerequistes

Docker Desktop (Installed and running on the system)


## Setup Instructions

### 1. Clone the repository and configure environment
Run these commands in your terminal to set up the project files:

```bash
git clone 
cd dashboard_project

cp .env.example .env
# Remember to open the new .env file and add your database password!



2. Launch the application 

docker-compose up --build

3. Access the dashboard

http://localhost:5173


Development workflow

1. Stopping the app: 

Run docker-compose down.

2. Cleaning data: 

To wipe the database and start fresh, run docker-compose down -v.

3. Adding new dependencies: 

Add them to the respective package.json in server/ or client/, then run docker-compose up --build to reinstall them inside the containers.