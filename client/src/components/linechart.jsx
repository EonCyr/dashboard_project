import { ResponsiveContainer, CartesianGrid, Legend, Line, LineChart, Tooltip, XAxis, YAxis } from 'recharts'

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