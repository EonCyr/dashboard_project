import React from 'react';

export default function TherapistSummaryCard({ 
  therapistName = 'Sarah Jenkins', 
  assignedStudentsCount = 8, 
  maxCapacity = 10,
  atRiskCount = 2 
}) {
  // Get initial for avatar bubble
  const initial = therapistName ? therapistName.charAt(0).toUpperCase() : 'T';

  return (
    <div className="therapist-summary-card">
      {/* Avatar Circle */}
      <div className="therapist-avatar">
        {initial}
      </div>

      {/* Main Content Info */}
      <div className="therapist-info">
        <div className="therapist-header">
          <h4 className="therapist-name">{therapistName}</h4>
          {/*<span className="therapist-role-badge">Lead Therapist</span> idk if this is relevant*/}
        </div>

        <div className="therapist-stats-row">
          <span className="stat-item">
            <strong>{assignedStudentsCount}</strong> / {maxCapacity} Assigned Students
          </span>
          <span className="dot-separator">•</span>
          <span className="stat-item at-risk-stat">
            <strong>{atRiskCount}</strong> At-Risk
          </span>
          <span className="dot-separator">•</span>
          <span className="stat-item status-online">
            Active Now
          </span>
        </div>
      </div>
    </div>
  );
}