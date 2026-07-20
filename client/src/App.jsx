import { useState, useEffect } from 'react'
import './App.css'
import { createLineChart } from './linechart.jsx'
import { loadData } from './loadData.jsx' 

function App() {
  // Authentication state
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [role, setRole] = useState(''); // 'parent' or 'tutor'

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState(''); 

  // Dashboard states
  const [data, setData] = useState(null);
  const [metrics, setMetrics] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Login component
  const handleLogin = async (e) => {
  e.preventDefault();
  setErrorMessage(''); // Clear previous errors

  try { //Tries to fetch the login API
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


// --- 1. LOGIN SCREEN ---
if (!isLoggedIn) {
  return (
    <div className="login-container">
      <form className="login-card" onSubmit={handleLogin}>
        <h2>Dashboard Login</h2>
        
        {errorMessage && <p style={{ color: 'red', fontWeight: 'bold' }}>{errorMessage}</p>}
        
        <input 
          type="text" 
          placeholder="Username" 
          value={username} 
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

        <button className="load-button" onClick={() => loadData(role, username, setMetrics, setIsLoading)} disabled={isLoading}>
          {isLoading ? 'Loading...' : 'Load Data'}
        </button>

        {/* NEW: Conditional check for empty metrics */}
        {metrics.length === 0 ? (
          <div className="empty-state">
            <p>No student data loaded. Please click the "Load Data" button to view progress.</p>
          </div>
        ) : (
          <div>
              {role === 'therapist' ? (
                // Therapist view: Rendered as a structured table layout
                <div className="table-responsive" style={{ overflowX: 'auto', marginTop: '1rem' }}>
                  <table className="student-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #ccc', backgroundColor: '#f9f9f9' }}>
                        <th style={{ padding: '12px' }}>Student ID</th>
                        <th style={{ padding: '12px' }}>Overall Band</th>
                        <th style={{ padding: '12px' }}>Vocab / Details</th>
                        <th style={{ padding: '12px' }}>Pa / Phonics</th>
                        <th style={{ padding: '12px' }}>Writing</th>
                        <th style={{ padding: '12px' }}>Listening / Reading</th>
                      </tr>
                    </thead>
                    <tbody>
                      {metrics.map((item) => (
                        <tr key={item.id} style={{ borderBottom: '1px solid #eee' }}>
                          <td style={{ padding: '12px', fontWeight: 'bold' }}>{item.id}</td>
                          <td style={{ padding: '12px' }}>
                            <span className="badge" style={{ padding: '4px 8px', background: '#e0e7ff', borderRadius: '4px', fontWeight: 'bold' }}>
                              {item.value}
                            </span>
                          </td>
                          <td style={{ padding: '12px', fontSize: '0.85rem' }}>{item.scores.vocab || '-'}</td>
                          <td style={{ padding: '12px', fontSize: '0.85rem' }}>{item.scores.pap || '-'}</td>
                          <td style={{ padding: '12px', fontSize: '0.85rem' }}>{item.scores.writing || '-'}</td>
                          <td style={{ padding: '12px', fontSize: '0.85rem' }}>{item.scores.lrc || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                // Parent view: Updated to display 4 cards per student
                <div className="card-grid">
                  {metrics.flatMap((student) => {
                    const scoreCards = [
                      { label: 'Vocab', value: student.scores?.vocab },
                      { label: 'Phonics', value: student.scores?.pap },
                      { label: 'Writing', value: student.scores?.writing },
                      { label: 'Listening', value: student.scores?.lrc },
                    ];

                    return scoreCards.map((score) => (
                      <article className="data-card" key={`${student.id}-${score.label}`}>
                        <p className="card-label">{student.id}: {score.label} | {student.semester}</p>
                        <h3>{score.value || 'N/A'}</h3>
                      </article>
                    ));
                  })}
                </div>
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