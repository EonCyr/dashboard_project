import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import './AddAssessmentModal.css'; 

export default function AddAssessmentModal({ isOpen, onClose, onSuccess , currentTherapistId = 1}) {
  const [activeTab, setActiveTab] = useState('individual');
  
  // Nested sub-component form state matching your exact JSON structure
  const [formData, setFormData] = useState({
    studentId: '',
    semester: '',
    centre: '',
    band: '',
    therapistId: currentTherapistId || '',
    vocab: { picture_naming: '', picture_description: '' },
    pa_phonics: { fluency: '', phonics: '', word_spelling: '', pa_identification: '' },
    writing: { edit_d1: '', edit_d2: '', edit_d3: '', letter_formation: '', narrative_writing: '', exposition_writing: '' },
    lrc: { persuasive_writing: '', reading_comprehension: '', listening_comprehension: '' }
  });

  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  if (!isOpen) return null;

  const handleIndividualSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Format payload to match the database's strict JSON schema key requirements
    const payload = {
      studentId: formData.studentId,
      semester: formData.semester,
      band: formData.band, // <-- Add this line here
      therapistId: formData.therapistId,
      scores: {
        "vocab": {
          "picture_naming": parseFloat(formData.vocab.picture_naming) || 0,
          "picture_description": parseFloat(formData.vocab.picture_description) || 0
        },
        "pa/phonics": {
          "fluency": parseFloat(formData.pa_phonics.fluency) || 0,
          "phonics": parseFloat(formData.pa_phonics.phonics) || 0,
          "word_spelling": parseFloat(formData.pa_phonics.word_spelling) || 0,
          "pa_identification": parseFloat(formData.pa_phonics.pa_identification) || 0
        },
        "writing": {
          "edit_d1": parseFloat(formData.writing.edit_d1) || 0,
          "edit_d2": parseFloat(formData.writing.edit_d2) || 0,
          "edit_d3": parseFloat(formData.writing.edit_d3) || 0,
          "letter_formation": parseFloat(formData.writing.letter_formation) || 0,
          "narrative_writing": parseFloat(formData.writing.narrative_writing) || 0,
          "exposition_writing": parseFloat(formData.writing.exposition_writing) || 0
        },
        "listening/readingcomprehension": {
          "persuasive_writing": parseFloat(formData.lrc.persuasive_writing) || 0,
          "reading_comprehension": parseFloat(formData.lrc.reading_comprehension) || 0,
          "listening_comprehension": parseFloat(formData.lrc.listening_comprehension) || 0
        }
      }
    };

    try {
      const response = await fetch('/api/assessments/single', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error('Failed to save individual assessment');
      setMessage('Assessment added successfully!');
      onSuccess?.();
      setTimeout(onClose, 1200);
    } catch (err) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  return ReactDOM.createPortal(
    <div className="modal-overlay">
      <div className="modal-content" style={{ width: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <h3>Add New Assessment</h3>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        <div className="tab-navigation">
          <button className={activeTab === 'individual' ? 'tab-btn active' : 'tab-btn'} onClick={() => setActiveTab('individual')}>Individual Entry</button>
          <button className={activeTab === 'bulk' ? 'tab-btn active' : 'tab-btn'} onClick={() => setActiveTab('bulk')}>Mass Import (File)</button>
        </div>

        {message && <div className="modal-message">{message}</div>}

        {activeTab === 'individual' ? (
          <form onSubmit={handleIndividualSubmit} className="assessment-form">
            <div className="form-row">
              <div className="form-group"><label htmlFor="student-id">Student ID</label>
                <input id="student-id" type="text" value={formData.studentId} onChange={(e) => setFormData({...formData, studentId: e.target.value})} required />
              </div>
              <div className="form-group"><label>Semester</label>
                <input type="text" placeholder="2026 Sem 1" value={formData.semester} onChange={(e) => setFormData({...formData, semester: e.target.value})} required />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group" style={{ width: '100%' }}>
                <label>Band (Optional)</label>
                <input
                  type="text"
                  name="band"
                  value={formData.band}
                  onChange={(e) => setFormData({ ...formData, band: e.target.value })}
                  placeholder="e.g. C7, B5"
                />
              </div>
            </div>

            <h4>Vocab</h4>
            <div className="form-row">
              <input type="number" step="0.1" placeholder="Picture Naming" value={formData.vocab.picture_naming} onChange={(e) => setFormData({...formData, vocab: {...formData.vocab, picture_naming: e.target.value}})} />
              <input type="number" step="0.1" placeholder="Picture Description" value={formData.vocab.picture_description} onChange={(e) => setFormData({...formData, vocab: {...formData.vocab, picture_description: e.target.value}})} />
            </div>

            <h4>Pa / Phonics</h4>
            <div className="form-row">
              <input type="number" step="0.1" placeholder="Fluency" value={formData.pa_phonics.fluency} onChange={(e) => setFormData({...formData, pa_phonics: {...formData.pa_phonics, fluency: e.target.value}})} />
              <input type="number" step="0.1" placeholder="Phonics" value={formData.pa_phonics.phonics} onChange={(e) => setFormData({...formData, pa_phonics: {...formData.pa_phonics, phonics: e.target.value}})} />
            </div>
            <div className="form-row">
              <input type="number" step="0.1" placeholder="Word Spelling" value={formData.pa_phonics.word_spelling} onChange={(e) => setFormData({...formData, pa_phonics: {...formData.pa_phonics, word_spelling: e.target.value}})} />
              <input type="number" step="0.1" placeholder="PA Identification" value={formData.pa_phonics.pa_identification} onChange={(e) => setFormData({...formData, pa_phonics: {...formData.pa_phonics, pa_identification: e.target.value}})} />
            </div>

            <h4>Writing</h4>
            <div className="form-row">
              <input type="number" step="0.1" placeholder="Edit D1" value={formData.writing.edit_d1} onChange={(e) => setFormData({...formData, writing: {...formData.writing, edit_d1: e.target.value}})} />
              <input type="number" step="0.1" placeholder="Edit D2" value={formData.writing.edit_d2} onChange={(e) => setFormData({...formData, writing: {...formData.writing, edit_d2: e.target.value}})} />
            </div>
            <div className="form-row">
              <input type="number" step="0.1" placeholder="Edit D3" value={formData.writing.edit_d3} onChange={(e) => setFormData({...formData, writing: {...formData.writing, edit_d3: e.target.value}})} />
              <input type="number" step="0.1" placeholder="Letter Formation" value={formData.writing.letter_formation} onChange={(e) => setFormData({...formData, writing: {...formData.writing, letter_formation: e.target.value}})} />
            </div>
            <div className="form-row">
              <input type="number" step="0.1" placeholder="Narrative Writing" value={formData.writing.narrative_writing} onChange={(e) => setFormData({...formData, writing: {...formData.writing, narrative_writing: e.target.value}})} />
              <input type="number" step="0.1" placeholder="Exposition Writing" value={formData.writing.exposition_writing} onChange={(e) => setFormData({...formData, writing: {...formData.writing, exposition_writing: e.target.value}})} />
            </div>

            <h4>Listening / Reading Comprehension</h4>
            <div className="form-row">
              <input type="number" step="0.1" placeholder="Persuasive Writing" value={formData.lrc.persuasive_writing} onChange={(e) => setFormData({...formData, lrc: {...formData.lrc, persuasive_writing: e.target.value}})} />
              <input type="number" step="0.1" placeholder="Reading Comprehension" value={formData.lrc.reading_comprehension} onChange={(e) => setFormData({...formData, lrc: {...formData.lrc, reading_comprehension: e.target.value}})} />
            </div>
            <div className="form-row">
              <input type="number" step="0.1" placeholder="Listening Comprehension" value={formData.lrc.listening_comprehension} onChange={(e) => setFormData({...formData, lrc: {...formData.lrc, listening_comprehension: e.target.value}})} />
            </div>

            <button type="submit" className="submit-btn" style={{ marginTop: '16px' }} disabled={loading}>
              {loading ? 'Saving...' : 'Save Assessment Components'}
            </button>
          </form>
        ) : (
          <form onSubmit={async (e) => {
            e.preventDefault();
            if (!file) return;
            setLoading(true);
            const data = new FormData();
            data.append('file', file);
            try {
              const res = await fetch('/api/assessments/bulk-import', { method: 'POST', body: data });
              if (!res.ok) throw new Error('Bulk upload failed');
              setMessage('Mass file imported successfully!');
              onSuccess?.();
              setTimeout(onClose, 1200);
            } catch (err) { setMessage(err.message); } finally { setLoading(false); }
          }} className="bulk-form">
            <div className="upload-zone">
              <p>Upload Excel Spreadsheet (.xlsx / .csv)</p>
              <input type="file" accept=".xlsx, .xls, .csv" onChange={(e) => setFile(e.target.files[0])} required />
            </div>
            <button type="submit" className="submit-btn" disabled={loading || !file}>
              {loading ? 'Importing Data...' : 'Upload & Process Mass Import'}
            </button>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
}