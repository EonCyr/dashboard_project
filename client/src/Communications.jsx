import { useState, useEffect } from 'react';

function CommunicationThread({ studentId, studentName, role, username, onClose }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const loadMessages = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/communications/${studentId}`);
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
    if (studentId) loadMessages();
  }, [studentId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    setErrorMessage('');

    try {
      const response = await fetch('/api/communications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
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

  return (
    <div className="comm-overlay">
      <div className="comm-panel">
        <header className="comm-header">
          <h3>{studentName} — Home &amp; Progress Notes</h3>
          <button onClick={onClose}>Close</button>
        </header>

        <div className="comm-thread">
          {isLoading && <p>Loading...</p>}
          {!isLoading && messages.length === 0 && <p>No messages yet.</p>}
          {messages.map((msg) => (
            <div key={msg.id} className={`comm-message ${msg.sender_role}`}>
              <p className="comm-meta">
                <strong>{msg.sender_role === 'parent' ? 'Parent' : 'Tutor'}</strong>
                {' '}({msg.sender_username}) — {new Date(msg.created_at).toLocaleString()}
              </p>
              <p>{msg.message}</p>
            </div>
          ))}
        </div>

        {errorMessage && <p style={{ color: 'red' }}>{errorMessage}</p>}

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
    </div>
  );
}

export default CommunicationThread;