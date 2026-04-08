"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { formatMonthYear } from "@/lib/format";

interface MonthData {
  month_year: string;
  receita_total: number;
  despesa_total: number;
}

export default function RevenueExpenseChart({ data }: { data: MonthData[] }) {
  const chartData = data.map((m) => ({
    name: formatMonthYear(m.month_year),
    Receita: Number(m.receita_total),
    Despesas: Number(m.despesa_total),
  }));

  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#111] p-5">
      <h3 className="mb-4 text-sm font-medium text-zinc-400">
        Receita vs Despesas
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
            tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`}
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
          <Line
            type="monotone"
            dataKey="Receita"
            stroke="#10b981"
            strokeWidth={2}
            dot={{ fill: "#10b981", r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="Despesas"
            stroke="#ef4444"
            strokeWidth={2}
            dot={{ fill: "#ef4444", r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
