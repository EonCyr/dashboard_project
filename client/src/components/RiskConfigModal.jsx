import React, { useState, useEffect } from 'react';

export default function RiskConfigModal({ isOpen, onClose, username, onSaveSuccess, initialConfigs }) {
  const [selectedBand, setSelectedBand] = useState('A');
  const [bandConfigs, setBandConfigs] = useState({
    A: { criticalScore: 22, moderateScore: 26, highPerformerScore: 29, baselineWindow: 2 },
    B: { criticalScore: 20, moderateScore: 25, highPerformerScore: 28, baselineWindow: 2 },
    C: { criticalScore: 18, moderateScore: 22, highPerformerScore: 25, baselineWindow: 2 }
  });
  const [statusMessage, setStatusMessage] = useState({ text: '', type: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch current rules when modal opens
  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();


    if (isOpen) {
      fetch('/api/config/risk', { signal: controller.signal })
        .then((res) => res.json())
        .then((data) => {
          if (isMounted && data && (data.A || data.B || data.C)) {
            setBandConfigs((prev) => ({
              A: data.A ? mapDataToState(data.A) : prev.A,
              B: data.B ? mapDataToState(data.B) : prev.B,
              C: data.C ? mapDataToState(data.C) : prev.C
            }));
          }
        })
        .catch((err) => {
        if (err.name === 'AbortError') return; // Silence test unmount cancellations
        if (isMounted) {
          setStatusMessage({ text: 'Loaded default threshold settings.', type: 'info' });
          }
        });
      }
      return () => {
          isMounted = false;
          controller.abort(); // Cancels the pending fetch when the test finishes
      };
  }, [isOpen]);

  const mapDataToState = (d) => ({
    criticalScore: d.critical_score ?? 20,
    moderateScore: d.moderate_score ?? 25,
    highPerformerScore: d.high_performer_score ?? 28,
    baselineWindow: d.baseline_window ?? 2
  });

  if (!isOpen) return null;
  const currentConfig = bandConfigs[selectedBand];

  const handleInputChange = (field, value) => {
    setBandConfigs((prev) => ({
      ...prev,
      [selectedBand]: {
        ...prev[selectedBand],
        [field]: value
      }
    }));
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatusMessage({ text: '', type: '' });

    const { criticalScore, moderateScore, highPerformerScore, baselineWindow } = currentConfig;

    if (Number(criticalScore) >= Number(moderateScore) || Number(moderateScore) >= Number(highPerformerScore)) {
      setStatusMessage({ 
        text: `Validation Error: Band ${selectedBand} thresholds must follow Critical < Moderate < High Performer.`, 
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
          band: selectedBand,
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
        <div className="modal-header">
          <h3>Configure Risk Assessment Metrics</h3>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>
        
        <div className="band-tab-container" >
          {['A', 'B', 'C'].map((band) => (
            <button
              key={band}
              type="button"
              className={`band-tab-btn ${selectedBand === band ? 'active' : ''}`}
              onClick={() => setSelectedBand(band)}
            
            >
              Band {band}
            </button>
          ))}
        </div>

        {statusMessage.text && (
          <div className={`alert-${statusMessage.type}`} style={{ padding: '8px 12px', marginBottom: '15px', borderRadius: '4px' }}>
            {statusMessage.text}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '12px' }}> {/*htmlfor and the id is needed to link, edited after testing*/}
            <label htmlFor="critical-score" style={{ display: 'block', fontWeight: 'bold' }}>Critical Risk Ceiling (&lt;)</label>
            <input 
              id="critical-score"
              type="number" 
              value={currentConfig.criticalScore} 
              onChange={(e) => handleInputChange('criticalScore', e.target.value)}
              required 
              style={{ width: '100%', padding: '8px', marginTop: '4px' }}
            />
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label htmlFor="moderate-score" style={{ display: 'block', fontWeight: 'bold' }}>Moderate / At-Risk Ceiling (&lt;)</label>
            <input 
              id="moderate-score" 
              type="number" 
              value={currentConfig.moderateScore} 
              onChange={(e) => handleInputChange('moderateScore', e.target.value)}
              required 
              style={{ width: '100%', padding: '8px', marginTop: '4px' }}
            />
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label htmlFor="high-score" style={{ display: 'block', fontWeight: 'bold' }}>High Performer Benchmark (&ge;)</label>
            <input 
              id="high-score"
              type="number" 
              value={currentConfig.highPerformerScore} 
              onChange={(e) => handleInputChange('highPerformerScore', e.target.value)}
              required 
              style={{ width: '100%', padding: '8px', marginTop: '4px' }}
            />
          </div>

          <div style={{ marginBottom: '18px' }}>
            <label htmlFor="baseline-window" style={{ display: 'block', fontWeight: 'bold' }}>Baseline Required Assessments</label>
            <input 
              id="baseline-window"
              type="number" 
              value={currentConfig.baselineWindow} 
              onChange={(e) => handleInputChange('baselineWindow', e.target.value)}
              required 
              style={{ width: '100%', padding: '8px', marginTop: '4px' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button type="button" className="modal-close-btn" onClick={onClose} >
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} >
              {isSubmitting ? 'Saving...' : `Save Band ${selectedBand}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}