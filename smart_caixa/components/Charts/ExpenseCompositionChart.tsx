"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface CategoryData {
  subcategoria: string;
  total: number;
}

const COLORS = [
  "#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6",
  "#ec4899", "#06b6d4", "#f97316", "#84cc16", "#a855f7",
  "#14b8a6", "#e11d48",
];

export default function ExpenseCompositionChart({ data }: { data: CategoryData[] }) {
  const chartData = data
    .filter((d) => Number(d.total) > 0)
    .sort((a, b) => Number(b.total) - Number(a.total))
    .map((d) => ({
      name: d.subcategoria,
      value: Number(d.total),
    }));

  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#111] p-5">
      <h3 className="mb-4 text-sm font-medium text-zinc-400">
        Composição de Despesas
      </h3>
      <ResponsiveContainer width="100%" height={350}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={110}
            paddingAngle={2}
            dataKey="value"
          >
            {chartData.map((_, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
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
          <Legend
            wrapperStyle={{ fontSize: "12px", color: "#a1a1aa" }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
