"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, ComposedChart } from "recharts";

interface ParetoData {
  name: string;
  value: number;
  cumulative: number;
  class: "A" | "B" | "C";
}

export default function ParetoChart({ data }: { data: ParetoData[] }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#111] p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-medium text-zinc-400">Análise ABC (Pareto)</h3>
        <div className="flex gap-3 text-xs">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-400" /> A (80%)</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400" /> B (15%)</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-400" /> C (5%)</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={350}>
        <ComposedChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis dataKey="name" tick={{ fill: "#71717a", fontSize: 9 }} tickLine={false} angle={-30} textAnchor="end" height={80} />
          <YAxis yAxisId="left" tick={{ fill: "#71717a", fontSize: 12 }} tickLine={false} tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} />
          <YAxis yAxisId="right" orientation="right" tick={{ fill: "#71717a", fontSize: 12 }} tickLine={false} tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
          <Tooltip
            contentStyle={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#fff" }}
            formatter={(value: unknown, name: unknown) => String(name) === "cumulative" ? `${Number(value).toFixed(1)}%` : `R$ ${Number(value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
          />
          <Bar yAxisId="left" dataKey="value" radius={[4, 4, 0, 0]} fill="#3b82f6"
            shape={(props: unknown) => {
              const { x, y, width, height, payload } = props as { x: number; y: number; width: number; height: number; payload: ParetoData };
              const color = payload.class === "A" ? "#ef4444" : payload.class === "B" ? "#f59e0b" : "#3b82f6";
              return <rect x={x} y={y} width={width} height={height} fill={color} rx={4} />;
            }}
          />
          <Line yAxisId="right" type="monotone" dataKey="cumulative" stroke="#10b981" strokeWidth={2} dot={{ fill: "#10b981", r: 3 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
