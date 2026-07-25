import { useState, useEffect } from 'react'
import './App.css'
import { createLineChart } from './components/linechart.jsx'
import { loadData } from './utils/loadData.jsx' 
import ReportDownload from './components/ReportDownload.jsx'
import { ClinicalStudentSelector } from './components/ClinicalReportDownload.jsx'
import { RelationshipManagerModal } from './components/RelationshipManager.jsx'
import { StudentModal } from './components/StudentModal.jsx'
import { useAuth } from './hooks/useAuth.jsx'
import CommunicationThread from './components/Communications.jsx'
import MessageParentsModal from './components/MessageParentsModal.jsx'

import { StudentLineChart } from './linechart.jsx'

import AtRiskTable from './AtRiskTable.jsx';
import RiskConfigModal from './RiskConfigModal.jsx';


const initialMetrics = [
  { title: 'Metric 1', value: 'A', detail: 'On track' },
  { title: 'Metric 2', value: '2', detail: 'get good' },
  { title: 'Metric 3', value: 'C', detail: 'Needs attention' },
  { title: 'Metric 4', value: '98.2%', detail: 'amazing' },
];

function App() {

  const [activeThread, setActiveThread] = useState(null); 
  const [isMessageAllOpen, setIsMessageAllOpen] = useState(false);

  // Authentication state
  const {
    isLoggedIn,
    role,
    setRole,
    userId,
    setUserId,
    username,
    setUsername,
    password,
    setPassword,
    errorMessage,
    setErrorMessage,
    handleLogin
  } = useAuth();

  // Dashboard states
  const [data, setData] = useState(null);
  const [metrics, setMetrics] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRelationshipManagerOpen, setIsRelationshipManagerOpen] = useState(false);
  const [sortBy, setSortBy] = useState('none');
  const [sortOrder, setSortOrder] = useState('asc');
  
  // States for the student pop up
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  // Calculate sliced metrics for the current page
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentMetrics = metrics.slice(indexOfFirstRow, indexOfLastRow);
  const totalPages = Math.ceil(metrics.length / rowsPerPage);

  // Single consolidated effect for fetching api root message upon login

  // State to control opening/closing the UC9 modal
  const [isRiskConfigOpen, setIsRiskConfigOpen] = useState(false);
  //Risk configuration for risk state
  const [riskConfig, setRiskConfig] = useState({
  critical_score: 20,
  moderate_score: 25,
  high_performer_score: 28,
  baseline_window: 2
});

// Fetch active risk thresholds when logged in
const fetchRiskConfig = async () => {
  try {
    const res = await fetch('/api/config/risk');
    if (!res.ok) return;
    const data = await res.json();
    if (data && !data.error) setRiskConfig(data);
  } catch (err) {
    console.error('Failed to load risk config', err);
  }
};

useEffect(() => {
  if (isLoggedIn) {
    fetchRiskConfig();
  }
}, [isLoggedIn]);

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
      setUserId(result.userid);
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
    if (isLoggedIn) { 
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

  // Handle row click to trigger modal
  const handleRowClick = (student) => {
    setSelectedStudent(student);
  };

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

  // Dashboard component
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
          <div className="sorting-controls" style={{ marginBottom: '16px', display: 'flex', gap: '16px' }}>
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
          </div>
        ) : null}
        
        <button className="load-button" onClick={() => loadData(role, username, setMetrics, setIsLoading, sortBy, sortOrder)} disabled={isLoading}>
          {isLoading ? 'Loading...' : 'Load Data'}
        </button>

        {/* ADAPTIVE CONTAINER: Always renders side-by-side structure regardless of data state */}
        <div className={`dashboard-content-layout ${role}`} style={{ marginTop: '20px' }}>
          
          {/* MAIN CONTENT AREA */}
          <div className="main-data-section">
            {metrics.length === 0 ? (
              <div className="empty-state" style={{ padding: '40px', textAlign: 'center', background: '#f9f9f9', borderRadius: '12px', border: '1px dashed #ddd' }}>
                <p style={{ color: '#666', margin: 0 }}>No student data loaded. Please click the "Load Data" button to view progress.</p>
              </div>
            ) : (
              role === 'therapist' ? (
                <div className="table-responsive">
                  <table className="student-table">

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
                        <th>Risk Status</th>
                        <th>Vocab / Details</th>
                        <th>Pa / Phonics</th>
                        <th>Writing</th>
                        <th>Listening / Reading</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentMetrics.map((item) => {
                          // risk status badge thresholds
                        const score = parseFloat(item.totalScore) || 0;
                        const historyCount = item.scoresCount || 2; // Default fallback count

                        let statusTag = 'STABLE_PROGRESS';
                        let statusLabel = 'On Track';

                        if (historyCount < riskConfig.baseline_window) {
                          statusTag = 'INSUFFICIENT_DATA';
                          statusLabel = 'Needs Baseline Data';
                        } else if (score < riskConfig.critical_score) {
                          statusTag = 'CRITICAL_RISK';
                          statusLabel = 'Critical Intervention Needed';
                        } else if (score >= riskConfig.critical_score && score < riskConfig.moderate_score) {
                          statusTag = 'MODERATE_RISK';
                          statusLabel = 'At-Risk / Stagnant';
                        } else if (score >= riskConfig.high_performer_score) {
                          statusTag = 'HIGH_PERFORMER';
                          statusLabel = 'Exceeding Milestones';
                        }

                          return (
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
                          <td className="score-cell"><div className="score-cell-total">Score: {item.scores.vocab.total}</div></td>
                          <td className="score-cell"><div className="score-cell-total">Score: {item.scores.pap.total}</div></td>
                          <td className="score-cell"><div className="score-cell-total">Score: {item.scores.writing.total}</div></td>
                          <td className="score-cell"><div className="score-cell-total">Score: {item.scores.lrc.total}</div></td>
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
                    <span className="pagination-info">Page {currentPage} of {totalPages || 1}</span>
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
                <div className="card-grid">
                  {metrics.flatMap((student) => {
                    const scoreCards = [
                      { label: 'Vocab', value: student?.scores?.vocab?.total ?? 'N/A' },
                      { label: 'Phonics', value: student?.scores?.pap?.total ?? 'N/A' },
                      { label: 'Writing', value: student?.scores?.writing?.total ?? 'N/A' },
                      { label: 'Listening', value: student?.scores?.lrc?.total ?? 'N/A' },
                    ];
                    return scoreCards.map((score) => (
                      <article className="data-card" key={`${student.id}-${score.label}`}>
                        <p className="card-label">{student.id}: {score.label} | {student.semester}</p>
                        <h3>{score.value || 'N/A'}</h3>
                      </article>
                    ));
                  })}
                </div>
              )
            )}

            {/* Comm Launcher Integration */}
            {metrics.length > 0 && (
              <div className="comm-launcher" style={{ marginTop: '20px' }}>
                <h3>Home & Progress Notes</h3>
                <ul>
                  {[...new Map(metrics.map((m) => [m.studentId, m])).values()].map((student) => (
                    <li key={student.studentId}>
                      {student.name}{' '}
                      <button onClick={() => setActiveThread({ studentId: student.studentId, parentId: student.parentId, studentName: student.name })}>
                        Open thread
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* ADAPTIVE SIDE PANEL */}
          <aside className="side-panel">
            <div className="panel-header">
              <h3>{role === 'therapist' ? 'Therapist Tools' : 'Parent Resources'}</h3>
            </div>

            {role === 'therapist' ? (
              <div className="panel-section">
                <div className="tool-button-group">
                  <button className="panel-action-btn">Add New Assessment</button>
                  <button className="panel-action-btn" onClick={() => setIsMessageAllOpen(true)}>Message Parents</button>
                  <button className="panel-action-btn primary" onClick={() => setIsRelationshipManagerOpen(true)}>
                    Manage Parent-Student Relationship
                  </button>
                </div>

                {metrics.length > 0 && metrics[0].id && (
                  <div className="panel-sub-module">
                    <ClinicalStudentSelector metrics={metrics} username={username} />
                  </div>
                )}
              </div>
            ) : (
              <div className="panel-section">
                <div className="info-card-notice">
                  <p>📅 Upcoming Parent-Teacher Meeting</p>
                </div>
                <button 
                  className="panel-action-btn"
                  onClick={() => {
                    if (metrics.length > 0) {
                      setActiveThread({
                        studentId: metrics[0].id,
                        parentId: userId,
                        studentName: metrics[0].name
                      });
                    }
                  }}
                >
                  Contact Tutor
                </button>
                
                <div className="panel-sub-module">
                  <ReportDownload studentId={metrics[0]?.id} username={username} />
                </div>
              </div>
            )}
          </aside>

        </div>

        {/* IN-DEPTH STUDENT MODAL OVERLAY */}
        <StudentModal 
          selectedStudent={selectedStudent}
          onClose={() => setSelectedStudent(null)}
        />

        {/* COMMUNICATION THREAD MODAL */}
        {activeThread && (
          <CommunicationThread
            studentId={activeThread.studentId}
            parentId={activeThread.parentId}
            studentName={activeThread.studentName}
            role={role}
            username={username}
            onClose={() => setActiveThread(null)}
          />
        )}

        <RelationshipManagerModal
          isOpen={isRelationshipManagerOpen}
          onClose={() => setIsRelationshipManagerOpen(false)}
          username={username}
          isLoading={isLoading}
          setIsLoading={setIsLoading}
        />

      </section>
      

      {isMessageAllOpen && (
        <MessageParentsModal username={username} onClose={() => setIsMessageAllOpen(false)} />
      )}

      <RiskConfigModal
          isOpen={isRiskConfigOpen}
          onClose={() => setIsRiskConfigOpen(false)}
          username={username}
          onSaveSuccess={() => {
            fetchRiskConfig();
            loadData(role, username, setMetrics, setIsLoading, sortBy, sortOrder);
          }}
        />
      {isMessageAllOpen && (
        <MessageParentsModal username={username} onClose={() => setIsMessageAllOpen(false)} />
      )}
    </div>
  );
}

export default App;