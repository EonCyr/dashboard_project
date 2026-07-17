import { useState, useEffect } from 'react'
import './App.css'
import { createLineChart } from './linechart.jsx'

const initialMetrics = [
  { title: 'Metric 1', value: 'A', detail: 'On track' },
  { title: 'Metric 2', value: '2', detail: 'get good' },
  { title: 'Metric 3', value: 'C', detail: 'Needs attention' },
  { title: 'Metric 4', value: '98.2%', detail: 'amazing' },
]

function App() {
  // Authentication state
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [role, setRole] = useState(''); // 'parent' or 'tutor'

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState(''); 

  // dashboard states
  const [data, setData] = useState(null);
  const [metrics, setMetrics] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Login component
  const handleLogin = async (e) => {
  e.preventDefault();
  setErrorMessage(''); // Clear previous errors

  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, role })
    });

    const result = await response.json();

    if (response.ok) {
      setRole(result.role);
      setIsLoggedIn(true);
    } else {
      // Use setErrorMessage instead of alert
      setErrorMessage(result.error || 'Login failed');
    }
  } catch (error) {
    console.error('Login request failed:', error);
    // Use setErrorMessage instead of alert
    setErrorMessage('Could not connect to server. Please check your network.');
  }
};

  useEffect(() => {
    if (isLoggedIn) { // Only fetch when logged in
      const fetchData = async () => {
        try {
          const response = await fetch('/api/');
          const result = await response.json();
          setData(result.message);
        } catch (error) { console.error(error); }
      };
      fetchData();
    }
  }, [isLoggedIn]);

  // Function to load student data from the API
  const loadData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/students?role=${role}&username=${username}`);
      
      if (!response.ok) {
        throw new Error('Failed to load student data');
      }

      const students = await response.json();
      const studentMetrics = students.map((student) => {
        let parsedScores = student.scores;

        if (typeof parsedScores === 'string') {
          try {
            parsedScores = JSON.parse(parsedScores);
          } catch (error) {
            parsedScores = {};
          }
        }

        return {
          name: student.name,
          band: student.band || 'N/A',
          scores: {
            vocab: parsedScores?.vocab || 'N/A',
            pap: parsedScores?.['pa/phonics'] || 'N/A',
            writing: parsedScores?.writing || 'N/A',
            lrc: parsedScores?.['listening/readingcomprehension'] || 'N/A',
          },
        };
      });
      setMetrics(studentMetrics);
    } catch (error) {
      console.error('Error loading student data:', error);
      setMetrics([{ title: 'Error', value: 'No data', detail: 'Unable to load student records' }]);
    } finally {
      setIsLoading(false);
    }
  };

// --- 1. LOGIN SCREEN ---
if (!isLoggedIn) {
  return (
    <div className="login-container">
      <form className="login-card" onSubmit={handleLogin}>
        <h2>Dashboard Login</h2>
        
        {/* ADDED: Display error if it exists */}
        {errorMessage && <p style={{ color: 'red', fontWeight: 'bold' }}>{errorMessage}</p>}
        
        <input 
          type="text" 
          placeholder="Username" 
          value={username} 
          // UPDATED: Clears error when user types
          onChange={(e) => { setUsername(e.target.value); setErrorMessage(''); }} 
          required 
        />
        
        <input 
          type="password" 
          placeholder="Password" 
          value={password} 
          // UPDATED: Clears error when user types
          onChange={(e) => { setPassword(e.target.value); setErrorMessage(''); }} 
          required 
        />

        <select 
          onChange={(e) => { setRole(e.target.value); setErrorMessage(''); }} 
          required
        >
          <option value="">Select Role</option>
          <option value="parent">Parent</option>
          <option value="therapist">Therapist</option>
        </select>
        
        <button type="submit">Log In</button>
      </form>
    </div>
  );
}

  return (
    <div className={`dashboard ${role}`}>
      <header className="dashboard-header">
        <div>
          <h1>{role === 'therapist' ? 'Therapist Management Dashboard' : 'Parent Progress Portal'}</h1>
        </div>
      </header>

      <section className="panel">
        <h2>Student Metrics</h2>
        {data && <p>API Response: {data}</p>}

        <button className="load-button" onClick={loadData} disabled={isLoading}>
          {isLoading ? 'Loading...' : 'Load Data'}
        </button>

        {/* NEW: Conditional check for empty metrics */}
        {metrics.length === 0 ? (
          <div className="empty-state">
            <p>No student data loaded. Please click the "Load Data" button to view progress.</p>
          </div>
        ) : (
          <div className="card-grid">
              {role === 'therapist' ? (
                // Therapist view: remains the same
                metrics.map((item) => (
                  <article className="data-card" key={item.name}>
                    <p className="card-label">{item.name}</p>
                    <h3>{item.band}</h3> 
                    <div className="sub-details" style={{ fontSize: '0.75rem', color: '#888' }}>
                      V: {item.scores.vocab || '-'} | P: {item.scores.pap || '-'}
                    </div>
                  </article>
                ))
              ) : (
                // Parent view: Updated to display 4 cards per student
                metrics.flatMap((student) => {
                  // Define the individual metrics to display
                  const scoreCards = [
                    { label: 'Vocab', value: student.scores.vocab },
                    { label: 'Phonics', value: student.scores.pap },
                    { label: 'Writing', value: student.scores.writing },
                    { label: 'Listening', value: student.scores.lrc },
                  ];

                  // Return the cards for this specific student
                  return scoreCards.map((score) => (
                    <article className="data-card" key={`${student.name}-${score.label}`}>
                      <p className="card-label">{student.name}: {score.label}</p>
                      <h3>{score.value || 'N/A'}</h3>
                    </article>
                  ));
                })
              )}
            </div>
        )}

        <div className="content-row">
          <div className="chart-wrapper">{createLineChart()}</div>
          <aside className="side-panel">
            <h3>{role === 'therapist' ? 'Therapist Tools' : 'Parent Resources'}</h3>
              {role === 'therapist' ? (
                <ul>
                  <li><button>Add New Assessment</button></li>
                  <li><button>Message All Parents</button></li>
                </ul>
              ) : (
                <ul>
                  <li><p>Upcoming Parent-Teacher Meeting</p></li>
                  <li><button>Contact Tutor</button></li>
                </ul>
              )}
          </aside>
        </div>
      </section>

    </div>
  )
}

export default App