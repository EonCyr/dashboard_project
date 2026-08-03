import { useState, useEffect } from 'react';
import { StudentLineChart, SemBarChart } from './linechart.jsx';
import { calculateStudentScores } from '../utils/scoreCalculator.jsx';

export function StudentModal({ selectedStudent, onClose }) {
  const [studentHistory, setStudentHistory] = useState([]);
  const [activeSemesterData, setActiveSemesterData] = useState(null);
  const [visibleCategories, setVisibleCategories] = useState({
    overall: true,
    vocab: false,
    pap: false,
    writing: false,
    lrc: false,
  });

  useEffect(() => {
    if (!selectedStudent) return;

    const fetchHistory = async () => {
      try {
        const response = await fetch(`/api/student-history/${selectedStudent.id}`);
        const rawHistory = await response.json();
        
        const formattedHistory = rawHistory.map((row) => {
          const scoreData = calculateStudentScores(row.scores, row.band || selectedStudent.value);
          return {
            semester: row.semester,
            ...scoreData
          };
        });

        setStudentHistory(formattedHistory);
        const currentMatch = formattedHistory.find(h => h.semester === selectedStudent.semester) || formattedHistory[formattedHistory.length - 1];
        setActiveSemesterData(currentMatch);
      } catch (err) {
        console.error('Failed to load history graph data', err);
      }
    };

    fetchHistory();
  }, [selectedStudent]);

  if (!selectedStudent || !activeSemesterData) return null;

  return (
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
            <div className="chart-panel">
              <h4>Semester Overview</h4>
              <SemBarChart semesterData={activeSemesterData} />
            </div>
            <div className="chart-panel">
              <h4>Historical Performance Trend</h4>
              <div className="semester-tabs-container" style={{ margin: '0 0 12px 0' }}>
                {['overall', 'vocab', 'pap', 'writing', 'lrc'].map((catKey) => {
                  const categoryTitles = { overall: 'Overall', vocab: 'Vocabulary', pap: 'Pa / Phonics', writing: 'Writing', lrc: 'Listening / Reading' };
                  return (
                    <button
                      key={catKey}
                      className={`semester-tab-btn ${visibleCategories[catKey] ? 'active' : ''}`}
                      onClick={() => setVisibleCategories((prev) => ({ ...prev, [catKey]: !prev[catKey] }))}
                    >
                      {categoryTitles[catKey]}
                    </button>
                  );
                })}
              </div>
              <StudentLineChart historyData={studentHistory} visibleCategories={visibleCategories} />
            </div>
          </div>

          {/* RIGHT COLUMN: Active Semester Category Cards */}
          <div className="modal-right-column">
            {['vocab', 'pap', 'writing', 'lrc'].map((catKey) => {
              const categoryTitles = { vocab: 'Vocabulary', pap: 'Pa / Phonics', writing: 'Writing', lrc: 'Listening / Reading' };
              const categoryData = activeSemesterData.scores[catKey];
              return (
                <div className="modal-box" key={catKey}>
                  <h4>{categoryTitles[catKey]} (Total: {categoryData.total})</h4>
                  <div>
                    {categoryData.items.map((sub, idx) => (
                      <div key={idx} className="modal-score-row">
                        <span className="modal-score-label">{sub.label}</span>
                        <span className="modal-score-value">{sub.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <button className="modal-close-btn" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}