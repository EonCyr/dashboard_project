import React, { useEffect, useState } from 'react';

export default function AtRiskTable({ teacherId, onSelectStudent }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Fetch evaluated student risk data for UC6
    fetch(`/api/students/at-risk?teacherId=${teacherId || 1}`)
      .then((res) => {
        if (!res.ok) throw new Error('Risk analytics calculation timed out.');
        return res.json();
      })
      .then((data) => {
        setStudents(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [teacherId]);

  if (loading) return <div className="loading-text">Loading Student Risk Analytics (UC6)...</div>;

  return (
    <div className="at-risk-container">
      <h3>At-Risk Student Monitoring</h3>

      {/* Alt Flow 4a Error Banner */}
      {error && (
        <div className="alert-error" style={{ color: 'orange', padding: '10px' }}>
          ⚠️ <strong>Notice:</strong> {error} Showing default list.
        </div>
      )}

      {/* Alt Flow 3a Confirmation Message if all students are stable */}
      {!error && students.length > 0 && students.every((s) => s.statusTag === 'STABLE') && (
        <div className="alert-success" style={{ color: 'green', padding: '10px' }}>
          🟢 All student learning trajectories are currently stable.
        </div>
      )}

      <div className="table-responsive">
        <table className="student-table">
          <thead>
            <tr>
              <th>Student ID</th>
              <th>Enrollment Date</th>
              <th>Latest Score</th>
              <th>Total Assessments</th>
              <th>Risk Status Flag</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr key={student.Student_ID} className={`row-${student.statusTag.toLowerCase()}`}>
                <td>#{student.Student_ID}</td>
                <td>{new Date(student.Enrollment_Date).toLocaleDateString()}</td>
                <td>{student.latestScore}</td>
                <td>{student.assessmentsCount} records</td>
                <td>
                  <span className={`badge badge-${student.statusTag}`}>
                    {student.statusLabel}
                  </span>
                </td>
                <td>
                  {/* Extension Flow 4b: Triggers existing student modal */}
                  <button 
                    className="action-btn"
                    onClick={() => onSelectStudent && onSelectStudent({ id: student.Student_ID })}
                  >
                    View Trajectory
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}