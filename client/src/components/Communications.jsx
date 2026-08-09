import { useState, useEffect } from 'react';

function CommunicationThread({ studentId, parentId, studentName, role, username, onClose, embedded = false }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const loadMessages = async () => {
    if (!studentId || !parentId) return;
    setIsLoading(true);
    setErrorMessage('');
    try {
      const response = await fetch(`/api/communications/${studentId}/${parentId}`);
      if (!response.ok) throw new Error('Failed to load messages');
      const result = await response.json();
      setMessages(result);
    } catch (error) {
      console.error(error);
      setErrorMessage('Could not load messages.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (studentId && parentId) loadMessages();
  }, [studentId, parentId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !studentId || !parentId) return;
    setErrorMessage('');

    try {
      const response = await fetch('/api/communications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          parentId,
          senderUsername: username,
          senderRole: role,
          message: newMessage
        })
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to send message');
      }

      setNewMessage('');
      loadMessages();
    } catch (error) {
      console.error(error);
      setErrorMessage(error.message);
    }
  };

  const threadBody = (
    <div className="comm-thread-content">
      {!embedded && (
        <header className="comm-header">
          <h3>{studentName} — Home &amp; Progress Notes</h3>
          <button onClick={onClose}>Close</button>
        </header>
      )}

      {embedded && (
        <div className="thread-title-heading">
          Chat with {studentName}
        </div>
      )}

        <div className="comm-thread">
          {isLoading && <p>Loading...</p>}
          {!isLoading && messages.length === 0 && <p>No messages yet.</p>}
          {messages.map((msg) => (
            <div key={msg.id} className={`comm-message ${msg.sender_role}`}>
              <div className="compact-msg-header">
              <span className="author-tag">
                {msg.sender_role === 'parent' ? '👤 Parent' : '🩺 Therapist'} ({msg.sender_username})
              </span>
              <span className="time-tag">
                {new Date(msg.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
              </span>
            </div>
            <p className="compact-msg-body">{msg.message}</p>
          </div>
          ))}
        </div>

        {errorMessage && <p style={{ color: 'red', margin: '8px 0' }}>{errorMessage}</p>}

        <form className="comm-form" onSubmit={handleSubmit}>
          <textarea
            placeholder={role === 'parent'
              ? 'Share a home observation...'
              : 'Add a professional recommendation...'}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            maxLength={2000}
            required
          />
          <button type="submit">
            {role === 'parent' ? 'Submit Observation' : 'Submit Recommendation'}
          </button>
        </form>
      </div>
    
  );

if (embedded) {
    return threadBody;
  }

  // Standalone fallback popup
  return (
    <div className="comm-overlay">
      <div className="comm-panel">
        {threadBody}
      </div>
    </div>
  );
}

export default CommunicationThread;