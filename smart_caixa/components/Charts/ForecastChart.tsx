"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface ForecastData {
  name: string;
  Real?: number;
  Projeção?: number;
  Otimista?: number;
  Pessimista?: number;
}

export default function ForecastChart({ data, label }: { data: ForecastData[]; label: string }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#111] p-5">
      <h3 className="mb-4 text-sm font-medium text-zinc-400">Projeção — {label}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis dataKey="name" tick={{ fill: "#71717a", fontSize: 11 }} tickLine={false} />
          <YAxis tick={{ fill: "#71717a", fontSize: 12 }} tickLine={false} tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} />
          <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#fff" }} formatter={(value: unknown) => `R$ ${Number(value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} />
          <Legend wrapperStyle={{ fontSize: "11px" }} />
          <Line type="monotone" dataKey="Real" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
          <Line type="monotone" dataKey="Projeção" stroke="#3b82f6" strokeWidth={2} strokeDasharray="8 4" dot={{ r: 3 }} />
          <Line type="monotone" dataKey="Otimista" stroke="#10b981" strokeWidth={1} strokeDasharray="4 4" dot={false} />
          <Line type="monotone" dataKey="Pessimista" stroke="#ef4444" strokeWidth={1} strokeDasharray="4 4" dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
