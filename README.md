# Dashboard Project

This project is a full-stack web application developed in partnership with the Dyslexia Association of Singapore (DAS). The platform serves as a centralized, secure data hub designed to bridge the communication gap between tutors and parents, fostering a transparent and collaborative environment for neurodivergent learners. By centralizing student performance data, the portal enables stakeholders to move beyond static reports toward a more dynamic understanding of a student’s unique learning journey.

At its core, the dashboard prioritizes clarity and growth-oriented insights, ensuring that data presentation is meaningful and accessible. By replacing generic grade reporting with nuanced metrics across vocabulary, phonics, writing, and listening, the platform empowers tutors to deliver targeted pedagogical interventions while providing parents with actionable, strengths-based progress updates. This approach directly supports the DAS mission by ensuring that data serves as a tool for encouragement rather than just assessment, helping to build a "growth mindset" for every student. Through this collaborative and accessible design, the project seeks to establish a high standard for professional communication in educational settings, ultimately improving learning outcomes for students supported by the DAS.



.

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
```

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
```


### 2. Launch the application 
```bash
docker-compose up --build
```

### 3. Access the dashboard
```bash
http://localhost:5173
```

## Development workflow

### 1. Stopping the app: 

Run docker-compose down.

### 2. Cleaning data: 

To wipe the database and start fresh, run docker-compose down -v.

### 3. Adding new dependencies: 

Add them to the respective package.json in server/ or client/, then run docker-compose up --build to reinstall them inside the containers.
