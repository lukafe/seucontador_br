"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

interface ScoreEvolutionChartProps {
  data: { name: string; score: number }[];
}

export default function ScoreEvolutionChart({ data }: ScoreEvolutionChartProps) {
  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
        <XAxis
          dataKey="name"
          tick={{ fill: "#71717a", fontSize: 12 }}
          tickLine={false}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fill: "#71717a", fontSize: 12 }}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{
            background: "#1a1a1a",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "8px",
            color: "#fff",
          }}
          formatter={(value: unknown) => `${value}/100`}
        />
        <ReferenceLine y={70} stroke="#10b981" strokeDasharray="5 5" label={{ value: "Bom", fill: "#10b981", fontSize: 11 }} />
        <ReferenceLine y={50} stroke="#f59e0b" strokeDasharray="5 5" label={{ value: "Atenção", fill: "#f59e0b", fontSize: 11 }} />
        <Line
          type="monotone"
          dataKey="score"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={{ fill: "#3b82f6", r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
