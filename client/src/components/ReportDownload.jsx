import { useState } from 'react';

function ReportDownload({ studentId, username }) {
  const [semester, setSemester] = useState('');
  const [format, setFormat] = useState('pdf');
  const [status, setStatus] = useState('idle'); 
  const [errorMsg, setErrorMsg] = useState('');

  const handleDownload = async () => {
    if (!semester) {
      setErrorMsg('Please enter a semester (e.g. "2022 Sem 1").');
      return;
    }
    setStatus('loading');
    setErrorMsg('');

    try {
      const response = await fetch('/api/reports/parent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, semester, format, username }),
      });

      if (response.status === 404) {
        setStatus('nodata');
        setErrorMsg('No assessment data available for that semester.');
        return;
      }

      if (response.status === 504) {
        setStatus('timeout');
        setErrorMsg('The report is taking too long to generate.');
        return;
      }

      if (!response.ok) {
        throw new Error('Download failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `progress-report.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setStatus('idle');
    } catch (error) {
      console.error('Report download error:', error);
      setStatus('error');
      setErrorMsg('Download failed. Please try again.');
    }
  };

  return (
    <div className="report-download">
      <h3>Download Progress Report</h3>

      <div className="report-controls">
        <label>
          Semester
          <input
            type="text"
            placeholder="2022 Sem 1"
            value={semester}
            onChange={(e) => setSemester(e.target.value)}
          />
        </label>
        <select value={format} onChange={(e) => setFormat(e.target.value)}>
          <option value="pdf">PDF</option>
          <option value="txt">TXT</option>
        </select>
        <button onClick={handleDownload} disabled={status === 'loading'}>
          {status === 'loading' ? 'Generating...' : 'Download Report'}
        </button>
      </div>

      {errorMsg && (
        <p className="report-error">
          {errorMsg}
          {(status === 'timeout' || status === 'error') && (
            <button onClick={handleDownload}> Retry</button>
          )}
        </p>
      )}
    </div>
  );
}

export default ReportDownload;