import { useEffect, useState } from 'react';

export function RelationshipManagerModal({ isOpen, onClose, username, isLoading, setIsLoading }) {
  const [relationships, setRelationships] = useState([]);
  const [studentIdInput, setStudentIdInput] = useState('');
  const [parentIdInput, setParentIdInput] = useState('');
  const [relationshipInput, setRelationshipInput] = useState('');
  const [relationshipMessage, setRelationshipMessage] = useState('');

  const loadRelationships = async () => {
    if (!username) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/relationships?username=${encodeURIComponent(username)}`);
      if (!response.ok) {
        throw new Error('Failed to load relationships');
      }
      const data = await response.json();
      setRelationships(data);
      setRelationshipMessage('');
    } catch (error) {
      console.error('Error loading relationships:', error);
      setRelationshipMessage(error.message || 'Unable to load relationships');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRelationshipSubmit = async (mode) => {
    if (!studentIdInput || !parentIdInput) {
      setRelationshipMessage('Please enter both a student ID and a parent ID.');
      return;
    }

    setIsLoading(true);
    setRelationshipMessage('');

    try {
      const response = await fetch('/api/relationships', {
        method: mode === 'remove' ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          studentid: Number(studentIdInput),
          parentid: Number(parentIdInput),
          relationship: relationshipInput || 'Parent',
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Unable to update relationship');
      }

      setRelationshipMessage(result.message || 'Relationship updated');
      setStudentIdInput('');
      setParentIdInput('');
      setRelationshipInput('');
      await loadRelationships();
    } catch (error) {
      console.error('Relationship update failed:', error);
      setRelationshipMessage(error.message || 'Unable to update relationship');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadRelationships();
    }
  }, [isOpen, username]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Parent-Student Relationship Manager</h3>
          <button className="modal-close" onClick={onClose} aria-label="Close popup">
            ×
          </button>
        </div>

        <div style={{ display: 'grid', gap: '0.6rem', marginBottom: '0.75rem' }}>
          <input
            type="number"
            placeholder="Student ID"
            value={studentIdInput}
            onChange={(e) => setStudentIdInput(e.target.value)}
          />
          <input
            type="number"
            placeholder="Parent ID"
            value={parentIdInput}
            onChange={(e) => setParentIdInput(e.target.value)}
          />
          <input
            type="text"
            placeholder="Relationship (e.g. Mother)"
            value={relationshipInput}
            onChange={(e) => setRelationshipInput(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <button onClick={() => handleRelationshipSubmit('add')} disabled={isLoading}>Add Link</button>
          <button onClick={() => handleRelationshipSubmit('remove')} disabled={isLoading}>Remove Link</button>
        </div>

        {relationshipMessage && <p style={{ color: '#0b5fff', margin: 0 }}>{relationshipMessage}</p>}

        <p style={{ marginTop: '0.75rem', marginBottom: '0.25rem' }}><strong>Current Relationships</strong></p>
        <ul>
          {relationships.length > 0 ? (
            relationships.map((item) => (
              <li key={`${item.studentid}-${item.parentid || 'none'}`}>
                Student {item.studentid} → Parent {item.parentid || 'N/A'} - {item.relationship || 'No relationship'}
              </li>
            ))
          ) : (
            <li>No relationships loaded yet.</li>
          )}
        </ul>
      </div>
    </div>
  );
}

export default RelationshipManagerModal;
