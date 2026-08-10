import { useState, useEffect } from 'react';

function ProfileSummaryCard({ studentId, studentName }) {
  const [summary, setSummary] = useState(null);
  const [band, setBand] = useState(null);
  const [therapistName, setTherapistName] = useState(null);
  const [assignedDuration, setAssignedDuration] = useState(null);
  const [showTherapistDetail, setShowTherapistDetail] = useState(false);
  const [status, setStatus] = useState('loading');
  const [therapistEmail, setTherapistEmail] = useState(null);

  useEffect(() => {
    if (!studentId) return;

    setStatus('loading');
    fetch(`/api/reports/parent-summary/${studentId}`)
      .then((res) => {
        if (res.status === 404) { setStatus('nodata'); return null; }
        if (!res.ok) throw new Error('Failed');
        return res.json();
      })
      .then((data) => {
        if (data) {
          setSummary(data.summary);
          setBand(data.band);
          setTherapistName(data.therapistName);
          setAssignedDuration(data.assignedDuration);
          setTherapistEmail(data.therapistEmail);
          setStatus('ready');
        }
      })
      .catch(() => setStatus('error'));
  }, [studentId]);

  if (!studentId) return null;

  const bandColor = {
    A: '#16a34a', B: '#2563eb', C: '#d97706',
  }[(band || 'B').charAt(0)] || '#2563eb';

  return (
    <div style={{
      borderRadius: '16px',
      marginBottom: '20px',
      background: 'white',
      border: '1px solid #e3e8f0',
      boxShadow: '0 4px 12px rgba(22, 32, 51, 0.05)',
      overflow: 'hidden',
    }}>
      {/* Main row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        padding: '16px 20px',
      }}>
        {/* Avatar */}
        <div style={{
          width: '48px', height: '48px', borderRadius: '50%',
          background: bandColor, color: 'white',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.2rem', fontWeight: 'bold', flexShrink: 0,
        }}>
          {studentName ? studentName.charAt(0).toUpperCase() : '?'}
        </div>

        {/* Name + summary */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '1rem', fontWeight: 700, color: '#162033' }}>
              {studentName || 'Your child'}
            </span>
            {band && (
              <span style={{
                padding: '2px 10px', borderRadius: '999px',
                background: bandColor + '1a', color: bandColor,
                fontWeight: 700, fontSize: '0.8rem',
              }}>
                Band {band}
              </span>
            )}
          </div>

          <div style={{
            fontSize: '0.85rem', color: '#51607a', marginTop: '4px',
            lineHeight: '1.4',
          }}>
            {status === 'loading' && (
              <span style={{ color: '#aaa' }}>Generating summary...</span>
            )}
            {status === 'nodata' && 'No assessment data available yet.'}
            {status === 'error' && 'Summary unavailable right now.'}
            {status === 'ready' && summary}
          </div>
        </div>
      </div>

      {/* Toggle strip — button only, no details shown here */}
      {status === 'ready' && therapistName && (
        <div style={{
          borderTop: '1px solid #f0f0f0',
          padding: '10px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          background: '#fafbff',
        }}>
          <button
            onClick={() => setShowTherapistDetail(prev => !prev)}
            aria-expanded={showTherapistDetail}
            style={{
              fontSize: '0.78rem',
              padding: '4px 12px',
              border: '1px solid #dce7ff',
              borderRadius: '8px',
              background: 'white',
              color: '#2563eb',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            {showTherapistDetail ? 'Hide therapist details ↑' : 'View therapist details ↓'}
          </button>
        </div>
      )}

      {/* Therapist detail panel  */}
      {showTherapistDetail && status === 'ready' && (
        <div style={{
          padding: '14px 20px',
          borderTop: '1px solid #f0f0f0',
          background: '#f8faff',
          fontSize: '0.85rem',
          color: '#374151',
        }}>
          <p style={{ margin: '0 0 6px' }}>
            <strong>Therapist:</strong> {therapistName}
          </p>
          <p style={{ margin: '0 0 6px' }}>
            <strong>Assigned for:</strong> {assignedDuration}
          </p>
          <p style={{ margin: '0 0 6px' }}>
            <strong>Email:</strong> {therapistEmail || 'Not available'}
          </p>
          <p style={{ margin: 0, color: '#6b7280', fontSize: '0.78rem' }}>
            To reach your therapist, use the "Contact Tutor" button in the panel on the right.
          </p>
        </div>
      )}
    </div>
  );
}

export default ProfileSummaryCard;
