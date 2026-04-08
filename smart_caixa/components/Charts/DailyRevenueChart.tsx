"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface Entry {
  data: string;
  tipo: string;
  valor: number;
}

export default function DailyRevenueChart({ entries }: { entries: Entry[] }) {
  // Group revenue by day
  const dailyMap = new Map<string, number>();
  entries
    .filter((e) => e.tipo === "Receita")
    .forEach((e) => {
      const day = new Date(e.data).getDate().toString();
      dailyMap.set(day, (dailyMap.get(day) || 0) + Number(e.valor));
    });

  const chartData = Array.from(dailyMap.entries())
    .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
    .map(([day, total]) => ({
      dia: `${day}`,
      Faturamento: total,
    }));

  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#111] p-5">
      <h3 className="mb-4 text-sm font-medium text-zinc-400">
        Faturamento Diário
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis
            dataKey="dia"
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
            }}
            formatter={(value: unknown) =>
              `R$ ${Number(value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
            }
            labelFormatter={(label) => `Dia ${label}`}
          />
          <Bar dataKey="Faturamento" fill="#10b981" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
