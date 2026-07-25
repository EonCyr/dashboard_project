// client/src/RiskConfigModal.jsx
import React, { useState, useEffect } from 'react';

export default function RiskConfigModal({ isOpen, onClose, username, onSaveSuccess }) {
  const [criticalScore, setCriticalScore] = useState(20);
  const [moderateScore, setModerateScore] = useState(25);
  const [highPerformerScore, setHighPerformerScore] = useState(28);
  const [baselineWindow, setBaselineWindow] = useState(2);
  
  const [statusMessage, setStatusMessage] = useState({ text: '', type: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch current rules when modal opens
  useEffect(() => {
    if (isOpen) {
      fetch('/api/config/risk')
        .then((res) => res.json())
        .then((data) => {
          if (data) {
            setCriticalScore(data.critical_score ?? 20);
            setModerateScore(data.moderate_score ?? 25);
            setHighPerformerScore(data.high_performer_score ?? 28);
            setBaselineWindow(data.baseline_window ?? 2);
          }
        })
        .catch(() => setStatusMessage({ text: 'Loaded default threshold settings.', type: 'info' }));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatusMessage({ text: '', type: '' });

    // Operational Flow 5 & Alt Flow 5a: Validation checks
    if (criticalScore >= moderateScore || moderateScore >= highPerformerScore) {
      setStatusMessage({ 
        text: 'Validation Error: Thresholds must strictly follow Critical < Moderate < High Performer.', 
        type: 'error' 
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/config/risk', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          criticalScore: Number(criticalScore),
          moderateScore: Number(moderateScore),
          highPerformerScore: Number(highPerformerScore),
          baselineWindow: Number(baselineWindow),
          username
        })
      });

      const data = await res.json();

      if (res.ok) {
        setStatusMessage({ text: 'Risk metrics successfully updated and synchronized!', type: 'success' });
        setTimeout(() => {
          if (onSaveSuccess) onSaveSuccess();
          onClose();
        }, 1200);
      } else {
        setStatusMessage({ text: data.error || 'Failed to save configuration.', type: 'error' });
      }
    } catch (err) {
      setStatusMessage({ text: 'Network error. Failed to commit settings.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ maxWidth: '500px' }}>
        <h2>UC9: Configure Risk Assessment Metrics</h2>
        <p className="modal-subtitle">Set quantitative threshold rules used across therapist dashboards.</p>

        {statusMessage.text && (
          <div className={`alert-${statusMessage.type}`} style={{ padding: '8px 12px', marginBottom: '15px', borderRadius: '4px' }}>
            {statusMessage.text}
          </div>
        )}

        <form onSubmit={handleSubmit}>
            
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontWeight: 'bold' }}>Critical Risk Score Ceiling (&lt;)</label>
            <input 
              type="number" 
              value={criticalScore} 
              onChange={(e) => setCriticalScore(e.target.value)}
              required 
              style={{ width: '100%', padding: '8px', marginTop: '4px' }}
            />
            
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontWeight: 'bold' }}>Moderate / At-Risk Score Ceiling (&lt;)</label>
            <input 
              type="number" 
              value={moderateScore} 
              onChange={(e) => setModerateScore(e.target.value)}
              required 
              style={{ width: '100%', padding: '8px', marginTop: '4px' }}
            />
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontWeight: 'bold' }}>High Performer Benchmark (&ge;)</label>
            <input 
              type="number" 
              value={highPerformerScore} 
              onChange={(e) => setHighPerformerScore(e.target.value)}
              required 
              style={{ width: '100%', padding: '8px', marginTop: '4px' }}
            />
          </div>

          <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', fontWeight: 'bold' }}>Baseline Required Assessments</label>
            <input 
              type="number" 
              value={baselineWindow} 
              onChange={(e) => setBaselineWindow(e.target.value)}
              required 
              style={{ width: '100%', padding: '8px', marginTop: '4px' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button type="button" className="modal-close-btn" onClick={onClose} style={{ background: '#6c757d' }}>
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} style={{ background: '#1e3a8a', color: '#fff', padding: '8px 16px', borderRadius: '4px' }}>
              {isSubmitting ? 'Saving...' : 'Apply & Sync Metrics'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}