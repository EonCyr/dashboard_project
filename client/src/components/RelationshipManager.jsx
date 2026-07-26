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

    if (mode === 'add' && !relationshipInput) {
      setRelationshipMessage('Please select a relationship.');
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
          relationship: relationshipInput,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        if (result.code === 'STUDENT_NOT_RELATED') {
          setRelationshipMessage('This student is not associated with your account.');
        } else if (result.code === 'PARENT_NOT_FOUND') {
          setRelationshipMessage('No parent account exists with that ID.');
        } else {
          setRelationshipMessage(result.error || 'Unable to update relationship');
        }
        return;
      }

      setRelationshipMessage(result.message || 'Relationship updated');
      await loadRelationships();
    } catch (error) {
      console.error('Relationship update failed:', error);
      setRelationshipMessage(error.message || 'Unable to update relationship');
    } finally {
      setIsLoading(false);
    }
  };

const handleClose = () => {
  setStudentIdInput('');
  setParentIdInput('');
  setRelationshipInput('');
  setRelationshipMessage('');
  onClose();
};

  useEffect(() => {
    if (isOpen) {
      loadRelationships();
    }
  }, [isOpen, username]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose} role="dialog" aria-modal="true">
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-split-container">
          <h3>Parent-Student Relationship Manager</h3>
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
          <select
            value={relationshipInput}
            onChange={(e) => setRelationshipInput(e.target.value)}
          >
            <option value="" disabled selected hidden>Relationship</option>
            <option value="Mother">Mother</option>
            <option value="Father">Father</option>
            <option value="Guardian">Guardian</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <button onClick={() => handleRelationshipSubmit('add')} disabled={isLoading}>Add Link</button>
          <button onClick={() => handleRelationshipSubmit('remove')} disabled={isLoading}>Remove Link</button>
        </div>

        {relationshipMessage && <p style={{ color: '#dc2626', margin: 0 }}>{relationshipMessage}</p>}

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
        <button className="modal-close-btn" onClick={handleClose}>
          Close
        </button>
      </div>
    </div>
  );
}

export default RelationshipManagerModal;
