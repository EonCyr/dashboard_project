import { useState, useEffect } from 'react';

function ProfileSummaryCard({ studentId, studentName }) {
  const [summary, setSummary] = useState(null);
  const [band, setBand] = useState(null);
  const [status, setStatus] = useState('loading'); 

  useEffect(() => {
    if (!studentId) return;

    setStatus('loading');
    fetch(`/api/reports/parent-summary/${studentId}`)
      .then((res) => {
        if (res.status === 404) {
          setStatus('nodata');
          return null;
        }
        if (!res.ok) throw new Error('Failed to load summary');
        return res.json();
      })
      .then((data) => {
        if (data) {
          setSummary(data.summary);
          setBand(data.band);
          setStatus('ready');
        }
      })
      .catch(() => setStatus('error'));
  }, [studentId]);

  if (!studentId) return null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        padding: '14px 20px',
        borderRadius: '14px',
        marginBottom: '20px',
        background: 'white',
        border: '1px solid #e3e8f0',
        boxShadow: '0 4px 12px rgba(22, 32, 51, 0.05)',
      }}
    >
      {/* Left: avatar */}
      <div
        style={{
          width: '44px',
          height: '44px',
          borderRadius: '50%',
          background: '#2563eb',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.1rem',
          fontWeight: 'bold',
          flexShrink: 0,
        }}
      >
        {studentName ? studentName.charAt(0).toUpperCase() : '?'}
      </div>

      {/* Middle: name + AI summary, stacked */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#162033' }}>
          {studentName || 'Your child'}
        </div>
        <div
          style={{
            fontSize: '0.85rem',
            color: '#51607a',
            marginTop: '2px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {status === 'loading' && 'Loading summary...'}
          {status === 'nodata' && 'No assessment data yet.'}
          {status === 'error' && 'Summary unavailable right now.'}
          {status === 'ready' && summary}
        </div>
      </div>

      
    </div>
  );
}

export default ProfileSummaryCard;
