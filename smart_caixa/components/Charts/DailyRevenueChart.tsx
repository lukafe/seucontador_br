"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ComposedChart,
  Line,
} from "recharts";

interface Entry {
  data: string;
  tipo: string;
  valor: number;
}

type ViewMode = "day" | "weekday";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default function DailyRevenueChart({ entries }: { entries: Entry[] }) {
  const [view, setView] = useState<ViewMode>("day");

  const revenueEntries = entries.filter((e) => e.tipo === "Receita");

  // By day of month
  const dailyMap = new Map<string, number>();
  revenueEntries.forEach((e) => {
    const day = new Date(e.data).getDate().toString();
    dailyMap.set(day, (dailyMap.get(day) || 0) + Number(e.valor));
  });
  const dailyData = Array.from(dailyMap.entries())
    .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
    .map(([day, total]) => ({ name: day, Faturamento: total }));

  // By day of week
  const weekdayMap = new Map<number, { total: number; count: number }>();
  revenueEntries.forEach((e) => {
    const dow = new Date(e.data).getDay();
    const cur = weekdayMap.get(dow) || { total: 0, count: 0 };
    cur.total += Number(e.valor);
    cur.count += 1;
    weekdayMap.set(dow, cur);
  });
  const weekdayData = Array.from(weekdayMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([dow, { total, count }]) => ({
      name: WEEKDAYS[dow],
      Faturamento: total,
      "Média/dia": Math.round(total / Math.max(count, 1)),
    }));

  const avgDaily = revenueEntries.length > 0
    ? revenueEntries.reduce((s, e) => s + Number(e.valor), 0) / dailyMap.size
    : 0;

  const chartData = view === "day" ? dailyData : weekdayData;

  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#111] p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-medium text-zinc-400">Faturamento Diário</h3>
        <div className="flex rounded-md border border-white/[0.06] bg-[#0a0a0a] p-0.5">
          <button
            onClick={() => setView("day")}
            className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
              view === "day" ? "bg-emerald-500/20 text-emerald-400" : "text-zinc-500 hover:text-white"
            }`}
          >
            Por dia
          </button>
          <button
            onClick={() => setView("weekday")}
            className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
              view === "weekday" ? "bg-emerald-500/20 text-emerald-400" : "text-zinc-500 hover:text-white"
            }`}
          >
            Dia da semana
          </button>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        {view === "day" ? (
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey="name" tick={{ fill: "#71717a", fontSize: 11 }} tickLine={false} />
            <YAxis tick={{ fill: "#71717a", fontSize: 12 }} tickLine={false} tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} />
            <Tooltip
              contentStyle={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#fff" }}
              formatter={(value: unknown) => `R$ ${Number(value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
              labelFormatter={(label) => `Dia ${label}`}
            />
            <ReferenceLine y={avgDaily} stroke="#f59e0b" strokeDasharray="5 5" label={{ value: "Média", fill: "#f59e0b", fontSize: 10 }} />
            <Bar dataKey="Faturamento" fill="#10b981" radius={[4, 4, 0, 0]} />
          </ComposedChart>
        ) : (
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey="name" tick={{ fill: "#71717a", fontSize: 11 }} tickLine={false} />
            <YAxis tick={{ fill: "#71717a", fontSize: 12 }} tickLine={false} tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} />
            <Tooltip
              contentStyle={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#fff" }}
              formatter={(value: unknown) => `R$ ${Number(value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
            />
            <Bar dataKey="Faturamento" fill="#10b981" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Média/dia" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
