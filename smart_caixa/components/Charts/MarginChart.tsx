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
import { formatMonthYear } from "@/lib/format";

interface MonthData {
  month_year: string;
  margem_liquida: number;
}

export default function MarginChart({ data }: { data: MonthData[] }) {
  const chartData = data.map((m) => ({
    name: formatMonthYear(m.month_year),
    Margem: Number((Number(m.margem_liquida) * 100).toFixed(1)),
  }));

  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#111] p-5">
      <h3 className="mb-4 text-sm font-medium text-zinc-400">
        Margem Líquida Mensal
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis
            dataKey="name"
            tick={{ fill: "#71717a", fontSize: 12 }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "#71717a", fontSize: 12 }}
            tickLine={false}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip
            contentStyle={{
              background: "#1a1a1a",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "8px",
              color: "#fff",
            }}
            formatter={(value: unknown) => `${Number(value).toFixed(1)}%`}
          />
          <ReferenceLine
            y={10}
            stroke="#f59e0b"
            strokeDasharray="5 5"
            label={{ value: "Meta 10%", fill: "#f59e0b", fontSize: 11 }}
          />
          <Line
            type="monotone"
            dataKey="Margem"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ fill: "#3b82f6", r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
