import { useState, useEffect } from 'react'
import './App.css'
import { createLineChart } from './linechart.jsx'

const initialMetrics = [
  { title: 'Metric 1', value: 'A', detail: 'On track' },
  { title: 'Metric 2', value: '2', detail: 'get good' },
  { title: 'Metric 3', value: 'C', detail: 'Needs attention' },
  { title: 'Metric 4', value: '98.2%', detail: 'amazing' },
]

function App() {
  const [data, setData] = useState(null);
  const [metrics, setMetrics] = useState(initialMetrics);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/');
        const result = await response.json();
        setData(result.message);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, []);

  // Function to load student data from the API
  const loadData = async () => {
    setIsLoading(true);

    try {
      const response = await fetch('/api/students');
      if (!response.ok) {
        throw new Error('Failed to load student data');
      }

      const students = await response.json();
      console.log('Fetched students:', students);
      const studentMetrics = students.map((student) => ({
        title: student.name,
        value: student.band,
        detail: student.progress
      }));

      setMetrics(studentMetrics);
    } catch (error) {
      console.error('Error loading student data:', error);
      setMetrics([{ title: 'Error', value: 'No data', detail: 'Unable to load student records' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1>Progress Dashboard</h1>
        </div>
      </header>

      <section className="panel">
        <h2>Student Metrics</h2>
        {data && <p>API Response: {data}</p>}

        <button className="load-button" onClick={loadData} disabled={isLoading}>
          {isLoading ? 'Loading...' : 'Load Data'}
        </button>
        

        <div className="card-grid">
          {metrics.map((item) => (
            <article className="data-card" key={item.title}>
              <p className="card-label">{item.title}</p>
              <h3>{item.value}</h3>
              <span>{item.detail}</span>
            </article>
          ))}
        </div>

        <div className="content-row">
          <div className="chart-wrapper">{createLineChart()}</div>
          <aside className="side-panel">
            <h3>Other Stuff</h3>
            <p>-Lock in</p>
          </aside>
        </div>
      </section>

    </div>
  )
}

export default App