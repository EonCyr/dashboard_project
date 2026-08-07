import { useState, useEffect } from 'react';
import CommunicationThread from './Communications.jsx';

function MessageParentsModal({ username, onClose }) {
  const [relationships, setRelationships] = useState([]);
  const [activeThread, setActiveThread] = useState(null);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastText, setBroadcastText] = useState('');
  const [broadcastStatus, setBroadcastStatus] = useState('');

  useEffect(() => {
    fetch(`/api/relationships?username=${username}`)
      .then((res) => res.json())
      .then(setRelationships)
      .catch((err) => console.error('Failed to load relationships:', err));
  }, [username]);

  const formatParentLabel = (parentName) => {
    if (!parentName) return 'No parent linked';
    return parentName
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const handleBroadcast = async () => {
    if (!broadcastText.trim()) return;
    setBroadcastStatus('Sending...');
    let successCount = 0;

    for (const rel of relationships) {
      if (!rel.parentid) continue; // skip students with no linked parent yet
      try {
        const res = await fetch('/api/communications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentId: rel.studentid,
            parentId: rel.parentid,
            senderUsername: username,
            senderRole: 'therapist',
            message: broadcastText
          })
        });
        if (res.ok) successCount++;
      } catch (err) {
        console.error(`Failed to message parent of student ${rel.studentid}:`, err);
      }
    }
    setBroadcastStatus(`Sent to ${successCount} of ${relationships.length} parent(s).`);
    setBroadcastText('');
  };

  return (
    <div className="comm-overlay">
      <div className="comm-panel">
        <header className="comm-header">
          <h3>Message Parents</h3>
          <button onClick={onClose}>Close</button>
        </header>
        

        <div className="message-mode-toggle">
          <button onClick={() => setIsBroadcasting(false)} disabled={!isBroadcasting}>
            Message One Parent
          </button>
          <button onClick={() => setIsBroadcasting(true)} disabled={isBroadcasting}>
            Message All Parents
          </button>
        </div>

        {!isBroadcasting && (
          <div className="parent-list">
            {relationships.map((rel) => {
              const parentLabel = formatParentLabel(rel.parent_name);
              return (
                <div key={`${rel.studentid}-${rel.parentid}`} className="parent-row">
                  <span className="parent-name">{parentLabel}</span>
                  {rel.parentid && (
                    <button
                      className="open-thread-btn"
                      onClick={() =>
                        setActiveThread({
                          studentId: rel.studentid,
                          parentId: rel.parentid,
                          studentName: parentLabel
                        })
                      }
                    >
                      Open thread
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {isBroadcasting && (
          <div className="broadcast-form">
            <textarea
              placeholder="Message to send to every linked parent..."
              value={broadcastText}
              onChange={(e) => setBroadcastText(e.target.value)}
              maxLength={2000}
            />
            <button onClick={handleBroadcast}>Send to All</button>
            {broadcastStatus && <p>{broadcastStatus}</p>}
          </div>
        )}

        {activeThread && (
          <CommunicationThread
            studentId={activeThread.studentId}
            parentId={activeThread.parentId}
            studentName={activeThread.studentName}
            role="therapist"
            username={username}
            onClose={() => setActiveThread(null)}
          />
        )}
      </div>
    </div>
  );
}

export default MessageParentsModal;