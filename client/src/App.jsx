import { useState, useEffect } from 'react'
import './App.css'
import { createLineChart } from './linechart.jsx'
import { loadData } from './loadData.jsx' 
import ReportDownload from './ReportDownload.jsx'
import { ClinicalStudentSelector } from './ClinicalReportDownload.jsx'
import { RelationshipManagerModal } from './RelationshipManager.jsx'
import { StudentLineChart } from './linechart.jsx'

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
  const [isRelationshipManagerOpen, setIsRelationshipManagerOpen] = useState(false);
  const [sortBy, setSortBy] = useState('none');
  const [sortOrder, setSortOrder] = useState('asc');
  
  // States for the student pop up
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;
  const [studentHistory, setStudentHistory] = useState([]);
  const [activeSemesterData, setActiveSemesterData] = useState(null);

  // Calculate sliced metrics for the current page
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentMetrics = metrics.slice(indexOfFirstRow, indexOfLastRow);
  const totalPages = Math.ceil(metrics.length / rowsPerPage);

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
  }

// 2. HandleRowClick

  const handleRowClick = async (student) => {
    setSelectedStudent(student);
    try {
      const response = await fetch(`/api/student-history/${student.id}`);
      const rawHistory = await response.json();
      
      const formattedHistory = rawHistory.map((row) => {
        const parsed = typeof row.scores === 'string' ? JSON.parse(row.scores) : row.scores || {};
        const band = (row.band || student.value || 'B').toUpperCase();
        
        let weights = { vocab: 0.25, pap: 0.35, writing: 0.20, lrc: 0.20 };
        if (band.startsWith('A')) weights = { vocab: 0.5, pap: 0.35, writing: 0.075, lrc: 0.075 };
        else if (band.startsWith('B')) weights = { vocab: 0.15, pap: 0.50, writing: 0.175, lrc: 0.175 };
        else if (band.startsWith('C')) weights = { vocab: 0.15, pap: 0.35, writing: 0.25, lrc: 0.25 };

        const calc = (obj) => Object.values(obj || {}).reduce((acc, v) => acc + (parseFloat(v) || 0), 0);
        
        const total = (
          (calc(parsed.vocab) * weights.vocab) +
          (calc(parsed['pa/phonics']) * weights.pap) +
          (calc(parsed.writing) * weights.writing) +
          (calc(parsed['listening/readingcomprehension']) * weights.lrc)
        ).toFixed(2);

        // Helper to format items for the modal rows
        const formatItems = (obj) => Object.entries(obj || {}).map(([key, val]) => ({
          label: key.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase()),
          value: val ?? 'N/A'
        }));
        return {
          semester: row.semester, 
          band: band,
          totalScore: total,
          score: parseFloat(total), // <--- Add this property for the chart to plot correctly
          scores: {
            vocab: { total: calc(parsed.vocab), items: formatItems(parsed.vocab) },
            pap: { total: calc(parsed['pa/phonics']), items: formatItems(parsed['pa/phonics']) },
            writing: { total: calc(parsed.writing), items: formatItems(parsed.writing) },
            lrc: { total: calc(parsed['listening/readingcomprehension']), items: formatItems(parsed['listening/readingcomprehension']) },
          }
        };
      });

      setStudentHistory(formattedHistory);
      // Default to the matching table row semester or the latest one
      const currentMatch = formattedHistory.find(h => h.semester === student.semester) || formattedHistory[formattedHistory.length - 1];
      setActiveSemesterData(currentMatch);
    } catch (err) {
      console.error('Failed to load history graph data', err);
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
      
          {role === "therapist" ? (
            <>
              <label>Sort by:
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                  <option value="none">None</option>
                  <option value="id">Student ID</option>
                  <option value="band">Overall Band</option>
                  <option value="vocab">Vocab</option>
                  <option value="pap">Pa / Phonics</option>
                  <option value="writing">Writing</option>
                  <option value="lrc">Listening / Reading</option>
                  <option value="semester">Semester</option>
                </select>
              </label>

              <label>Sort Order:
                <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
                  <option value="asc">Ascending</option>
                  <option value="desc">Descending</option>
                </select>
              </label>
            </>
          ) : null}
        
        <button className="load-button" onClick={() => loadData(role, username, setMetrics, setIsLoading, sortBy, sortOrder)} disabled={isLoading}>
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
                <div className="table-responsive" >
                  <table className="student-table" >
                    <thead>
                      <tr>
                        <th>Student ID</th>
                        <th>Overall Band</th>
                        <th>Vocab / Details</th>
                        <th>Pa / Phonics</th>
                        <th>Writing</th>
                        <th>Listening / Reading</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentMetrics.map((item) => (
                        <tr key={item.id} className='student-row' onClick={() => handleRowClick(item)}>
                          <td className="student-id-cell">
                              {item.id} <br />
                              <span className="student-semester">({item.semester})</span>
                            </td>
                            <td>
                              <span className="band-badge">{item.value}</span>
                              <div className="total-score-text">
                                Total: <strong>{item.totalScore}</strong>
                              </div>
                            </td>
                            {/* Student details */}
                            <td className="score-cell">
                              <div className="score-cell-total">Score: {item.scores.vocab.total}</div>
                            </td>

                            <td className="score-cell">
                              <div className="score-cell-total">Score: {item.scores.pap.total}</div>
                            </td>

                            <td className="score-cell">
                              <div className="score-cell-total">Score: {item.scores.writing.total}</div>
                            </td>

                            <td className="score-cell">
                              <div className="score-cell-total">Score: {item.scores.lrc.total}</div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                  {/* Pagination Controls */}
                  <div className="pagination-container">
                    <button 
                      className="pagination-btn"
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} 
                      disabled={currentPage === 1}
                    >
                      &larr; Previous
                    </button>
                    
                    <span className="pagination-info">
                      Page {currentPage} of {totalPages || 1}
                    </span>
                    
                    <button 
                      className="pagination-btn"
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} 
                      disabled={currentPage === totalPages || totalPages === 0}
                    >
                      Next &rarr;
                    </button>
                  </div>
                </div>
              ) : (
                // Parent view: Updated to display 4 cards per student
                <div className="card-grid">
                  {metrics.flatMap((student) => {
                    const scoreCards = [
                      { label: 'Vocab', value: student?.scores?.vocab?.total ?? 'N/A' },
                      { label: 'Phonics', value: student?.scores?.pap?.total ?? 'N/A' },
                      { label: 'Writing', value: student?.scores?.writing?.total ?? 'N/A' },
                      { label: 'Listening', value: student?.scores?.lrc?.total ?? 'N/A' },
                    ];
const getScoreValue = (student, key) => student?.scores?.[key]?.total ?? 'N/A';
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
        {/* IN-DEPTH STUDENT MODAL OVERLAY */}
          {selectedStudent && activeSemesterData && (
            <div className="modal-overlay">
              <div className="modal-card">
                <h2>Student ID: {selectedStudent.id} In-Depth Report</h2>
                <p className="modal-subtitle">
                  Overall Band: <strong>{activeSemesterData.band}</strong> | Weighted Score: <strong>{activeSemesterData.totalScore}</strong>
                </p>

                {/* CLICKABLE SEMESTER TABS */}
                <div className="semester-tabs-container">
                  {studentHistory.map((hist, idx) => (
                    <button
                      key={idx}
                      className={`semester-tab-btn ${activeSemesterData.semester === hist.semester ? 'active' : ''}`}
                      onClick={() => setActiveSemesterData(hist)}
                    >
                      {hist.semester}
                    </button>
                  ))}
                </div>

                <div className="modal-split-container">
                  {/* LEFT COLUMN: Line Chart */}
                  <div className="modal-left-column">
                    <div style={{ background: '#f9f9f9', padding: '15px', borderRadius: '6px', height: '100%' }}>
                      <h4 style={{ margin: '0 0 10px 0', color: '#1e3a8a' }}>Historical Performance Trend</h4>
                      <StudentLineChart historyData={studentHistory} />
                    </div>
                  </div>

                  {/* RIGHT COLUMN: Active Semester Category Cards */}
                  <div className="modal-right-column">
                    <div className="modal-box">
                      <h4>Vocabulary (Total: {activeSemesterData.scores.vocab.total})</h4>
                      <div>
                        {activeSemesterData.scores.vocab.items.map((sub, idx) => (
                          <div key={idx} className="modal-score-row">
                            <span className="modal-score-label">{sub.label}</span>
                            <span className="modal-score-value">{sub.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="modal-box">
                      <h4>Pa / Phonics (Total: {activeSemesterData.scores.pap.total})</h4>
                      <div>
                        {activeSemesterData.scores.pap.items.map((sub, idx) => (
                          <div key={idx} className="modal-score-row">
                            <span className="modal-score-label">{sub.label}</span>
                            <span className="modal-score-value">{sub.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="modal-box">
                      <h4>Writing (Total: {activeSemesterData.scores.writing.total})</h4>
                      <div>
                        {activeSemesterData.scores.writing.items.map((sub, idx) => (
                          <div key={idx} className="modal-score-row">
                            <span className="modal-score-label">{sub.label}</span>
                            <span className="modal-score-value">{sub.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="modal-box">
                      <h4>Listening / Reading (Total: {activeSemesterData.scores.lrc.total})</h4>
                      <div>
                        {activeSemesterData.scores.lrc.items.map((sub, idx) => (
                          <div key={idx} className="modal-score-row">
                            <span className="modal-score-label">{sub.label}</span>
                            <span className="modal-score-value">{sub.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <button 
                  className="modal-close-btn"
                  onClick={() => { setSelectedStudent(null); setActiveSemesterData(null); }}
                >
                  Close
                </button>
              </div>
            </div>
          )}





        <div className="content-row">
          <div className="chart-wrapper">{createLineChart()}</div>
          <aside className="side-panel">
            <h3>{role === 'therapist' ? 'Therapist Tools' : 'Parent Resources'}</h3>
           {role === 'therapist' ? (
            <>
              <ul>
                <li><button>Add New Assessment</button></li>
                <li><button>Message All Parents</button></li>
                <li><button onClick={() => setIsRelationshipManagerOpen(true)}>Manage Parent-Student Relationship</button></li>
              </ul>
              {metrics.length > 0 && metrics[0].id && (
                <ClinicalStudentSelector metrics={metrics} username={username} />
              )}
            </>
          ) : (
            <>
              <ul>
                <li><p>Upcoming Parent-Teacher Meeting</p></li>
                <li><button>Contact Tutor</button></li>
              </ul>
              <ReportDownload studentId={metrics[0]?.id} username={username} />
            </>
          )}
          </aside>
        </div>
      </section>

      <RelationshipManagerModal
        isOpen={isRelationshipManagerOpen}
        onClose={() => setIsRelationshipManagerOpen(false)}
        username={username}
        isLoading={isLoading}
        setIsLoading={setIsLoading}
      />

    </div>
  );

}

export default App