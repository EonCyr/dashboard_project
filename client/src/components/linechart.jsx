import { ResponsiveContainer, CartesianGrid, Legend, Line, LineChart, Tooltip, XAxis, YAxis } from 'recharts'

const data = [
  { name: '2020', uv: 400 },
  { name: '2021', uv: 300 },
  { name: '2022', uv: 320 },
  { name: '2023', uv: 200 },
  { name: '2024', uv: 278 },
  { name: '2025', uv: 189 },
]

export function createLineChart() {
  return (
    <div style={{ width: '100%', height: 320 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{
            top: 20,
            right: 20,
            bottom: 5,
            left: 0,
          }}
        >
          <CartesianGrid stroke="#aaa" strokeDasharray="5 5" />
          <Line dataKey="uv" stroke="#E91626" strokeWidth={2} name="My scores" />
          <XAxis 
            dataKey="semester" 
            interval={0}
            angle={-25}
            textAnchor="end"
            height={50} 
            tick={{ fontSize: 11 }}
          />
          <YAxis width="auto" label={{ value: 'Score', position: 'insideLeft', angle: -90 }} />
          <Legend align="center" />
          <Tooltip />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export function StudentLineChart({ historyData }) {
  return (
    <div style={{ width: '100%', height: 260 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={historyData}
          margin={{ top: 10, right: 20, bottom: 5, left: 0 }}
        >
          <CartesianGrid stroke="#aaa" strokeDasharray="5 5" />
          <Line dataKey="score" stroke="#E91626" strokeWidth={2} name="Weighted Score" />
          <XAxis dataKey="semester" />
          <YAxis width="auto" label={{ value: 'Score', position: 'insideLeft', angle: -90 }} />
          <Legend align="center" />
          <Tooltip />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}