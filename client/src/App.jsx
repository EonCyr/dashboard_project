import { useState, useEffect } from 'react'
import './App.css'
import { createLineChart } from './linechart.jsx'

// Temporary data
const metrics = [
  { title: 'Metric 1', value: 'A', detail: 'On track' },
  { title: 'Metric 2', value: '2', detail: 'get good' },
  { title: 'Metric 3', value: 'C', detail: 'Needs attention' },
  { title: 'Metric 4', value: '98.2%', detail: 'amazing' },
]

function App() {
  const [count, setCount] = useState(0)
  const [data, setData] = useState(null);

  useEffect(() => {
    // This code runs only ONCE when the component first appears
    const fetchData = async () => {
      try {
        const response = await fetch('/api/');
        const result = await response.json();
        setData(result.message);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, []); // The empty array [] ensures it only runs once

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