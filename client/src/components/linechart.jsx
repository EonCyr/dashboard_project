import { ResponsiveContainer, CartesianGrid, Legend, Line, LineChart, Tooltip, XAxis, YAxis, BarChart, Bar, Cell } from 'recharts'

const categoryColors = {
  overall: '#E91626',
  vocab: '#2563eb',
  pap: '#16a34a',
  writing: '#d97706',
  lrc: '#7c3aed',
}

const categoryLabels = {
  overall: 'Overall',
  vocab: 'Vocabulary',
  pap: 'Pa / Phonics',
  writing: 'Writing',
  lrc: 'Listening / Reading',
}

export function StudentLineChart({ historyData, visibleCategories = { overall: true, vocab: true, pap: true, writing: true, lrc: true } }) {
  const getSeriesValue = (entry, key) => {
    if (key === 'overall') return entry?.score ?? entry?.totalScore ?? 0
    return entry?.scores?.[key]?.weightedTotal ?? entry?.scores?.[key]?.total ?? 0
  }

  const chartData = (historyData || []).map((entry) => {
    const row = { semester: entry.semester }
    Object.entries(visibleCategories)
      .filter(([, isVisible]) => isVisible)
      .forEach(([key]) => {
        row[key] = getSeriesValue(entry, key)
      })
    return row
  })

  const series = Object.entries(visibleCategories).filter(([, isVisible]) => isVisible)

  return (
    <div style={{ width: '100%', height: 260, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{ top: 10, right: 20, bottom: 5, left: 0 }}
        >
          <CartesianGrid stroke="#aaa" strokeDasharray="5 5" />
          {series.map(([key]) => (
            <Line
              key={key}
              dataKey={key}
              stroke={categoryColors[key]}
              strokeWidth={2}
              name={categoryLabels[key]}
            />
          ))}
          <XAxis dataKey="semester" />
          <YAxis width="auto" label={{ value: 'Score', position: 'insideLeft', angle: -90 }} />
          <Legend align="center" />
          <Tooltip />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export function SemBarChart({ semesterData }) {
  const chartData = [
    { category: 'Vocabulary', value: semesterData?.scores?.vocab?.weightedTotal ?? semesterData?.scores?.vocab?.total ?? 0, color: categoryColors.vocab },
    { category: 'Pa / Phonics', value: semesterData?.scores?.pap?.weightedTotal ?? semesterData?.scores?.pap?.total ?? 0, color: categoryColors.pap },
    { category: 'Writing', value: semesterData?.scores?.writing?.weightedTotal ?? semesterData?.scores?.writing?.total ?? 0, color: categoryColors.writing },
    { category: 'Listening / Reading', value: semesterData?.scores?.lrc?.weightedTotal ?? semesterData?.scores?.lrc?.total ?? 0, color: categoryColors.lrc },
  ]

  return (
    <div style={{ width: '100%', height: 220, marginBottom: 0, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 8, right: 10, bottom: 20, left: 0 }}
        >
          <CartesianGrid stroke="#ddd" strokeDasharray="3 3" />
          <XAxis dataKey="category" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {chartData.map((entry) => (
              <Cell key={entry.category} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}