"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface ComparisonBarChartProps {
  data: { name: string; [key: string]: string | number }[];
  month1Key: string;
  month2Key: string;
}

export default function ComparisonBarChart({ data, month1Key, month2Key }: ComparisonBarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart data={data} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
        <XAxis
          type="number"
          tick={{ fill: "#71717a", fontSize: 11 }}
          tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`}
        />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fill: "#71717a", fontSize: 11 }}
          width={150}
        />
        <Tooltip
          contentStyle={{
            background: "#1a1a1a",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "8px",
            color: "#fff",
          }}
          formatter={(value: unknown) =>
            `R$ ${Number(value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
          }
        />
        <Legend />
        <Bar dataKey={month1Key} fill="#3b82f6" radius={[0, 4, 4, 0]} />
        <Bar dataKey={month2Key} fill="#10b981" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
