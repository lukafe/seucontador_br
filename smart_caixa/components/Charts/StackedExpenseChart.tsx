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
import { formatMonthYear } from "@/lib/format";

interface MonthCategoryData {
  month_year: string;
  categories: Record<string, number>;
}

const COLORS = [
  "#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6",
  "#ec4899", "#06b6d4", "#f97316", "#84cc16", "#a855f7",
];

export default function StackedExpenseChart({ data }: { data: MonthCategoryData[] }) {
  // Get all unique categories
  const allCategories = new Set<string>();
  data.forEach((m) => {
    Object.keys(m.categories).forEach((c) => allCategories.add(c));
  });

  const categories = Array.from(allCategories);

  const chartData = data.map((m) => ({
    name: formatMonthYear(m.month_year),
    ...m.categories,
  }));

  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#111] p-5">
      <h3 className="mb-4 text-sm font-medium text-zinc-400">
        Composição de Despesas por Mês
      </h3>
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis
            dataKey="name"
            tick={{ fill: "#71717a", fontSize: 11 }}
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
              maxHeight: "300px",
              overflow: "auto",
            }}
            formatter={(value: unknown) =>
              `R$ ${Number(value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
            }
          />
          <Legend wrapperStyle={{ fontSize: "11px" }} />
          {categories.map((cat, i) => (
            <Bar
              key={cat}
              dataKey={cat}
              stackId="expenses"
              fill={COLORS[i % COLORS.length]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
