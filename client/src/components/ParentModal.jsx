import React, { useState, useEffect } from 'react';
import { StudentLineChart, SemBarChart } from './linechart.jsx';
import { calculateStudentScores } from '../utils/scoreCalculator.jsx';

export function ParentModal({ metrics, username }) {
  const [parentSelectedSemester, setParentSelectedSemester] = useState(null);
  const [studentHistory, setStudentHistory] = useState([]);
  const [activeSemesterData, setActiveSemesterData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [visibleCategories, setVisibleCategories] = useState({
    overall: true,
    vocab: false,
    pap: false,
    writing: false,
    lrc: false,
  });

  const initialStudent = metrics && metrics.length > 0 ? metrics[0] : null;
  const studentId = initialStudent?.id || initialStudent?.studentId;

  useEffect(() => {
    if (!studentId) return;

    const fetchHistory = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/student-history/${studentId}`);
        const rawHistory = await response.json();
        
        if (Array.isArray(rawHistory) && rawHistory.length > 0) {
          // Format history using the same score calculator as the therapist modal
          const formattedHistory = rawHistory.map((row) => {
            const scoreData = calculateStudentScores(row.scores, row.band || initialStudent.value);
            return {
              semester: row.semester,
              band: row.band || row.value || initialStudent.value,
              ...scoreData
            };
          });

          setStudentHistory(formattedHistory);
          
          // Default to the latest or first semester
          const defaultMatch = formattedHistory[formattedHistory.length - 1];
          setActiveSemesterData(defaultMatch);
          setParentSelectedSemester(defaultMatch.semester);
        } else {
          // Fallback if history endpoint is empty
          setStudentHistory([initialStudent]);
          setActiveSemesterData(initialStudent);
          setParentSelectedSemester(initialStudent.semester);
        }
      } catch (err) {
        if (process.env.NODE_ENV !== 'test') {
          console.error('Failed to load student history for parent portal', err);
        }
        setStudentHistory([initialStudent]);
        setActiveSemesterData(initialStudent);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, [studentId]);

  // Handle manual tab clicks
  const handleSemesterClick = (hist) => {
    setParentSelectedSemester(hist.semester);
    setActiveSemesterData(hist);
  };

  if (!initialStudent || !activeSemesterData) return null;

  return (
    <div className="parent-portal-container">
      <div className="parent-header-bar">
        <div className="parent-header-top">
          <div>
            <h3>Student ID: {studentId}</h3>
            <p>
              Overall Band: <strong>{activeSemesterData.band || activeSemesterData.value || 'N/A'}</strong>
            </p>
          </div>
        </div>

        {/* Dynamic Semester Tabs */}
        {isLoading ? (
          <p style={{ fontSize: '14px', color: '#666', margin: '8px 0' }}>Loading semesters...</p>
        ) : (
          <div className="semester-tabs" style={{ marginTop: '10px', flexWrap: 'wrap' }}>
            {studentHistory.map((hist, idx) => {
              const isSelected = hist.semester === parentSelectedSemester;
              return (
                <button
                  key={idx}
                  onClick={() => handleSemesterClick(hist)}
                  className={`semester-tab-btn ${isSelected ? 'active' : ''}`}
                >
                  {hist.semester}
                </button>
              );
            })}
          </div>
        )}
      </div>
      <div className="card-grid">
        {[
          { label: 'Vocab', key: 'vocab' },
          { label: 'Phonics', key: 'pap' },
          { label: 'Writing', key: 'writing' },
          { label: 'Listening', key: 'lrc' },
        ].map((card) => {
          const categoryTotal = activeSemesterData?.scores?.[card.key]?.total ?? 'N/A';
          return (
            <article className="data-card" key={card.label}>
              <p className="card-label">{card.label}</p>
              <h3>{categoryTotal}</h3>
            </article>
          );
        })}
      </div>
      <div className="chart-row">
        <div className="chart-panel" style={{ width: '50%' }}>
          <h4>Semester Overview</h4>
          <SemBarChart semesterData={activeSemesterData} />
        </div>

        <div className="chart-panel" style={{ width: '50%' }}>
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

      
    </div>
  );
}