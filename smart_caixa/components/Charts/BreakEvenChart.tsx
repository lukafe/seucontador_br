"use client";

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

interface BreakEvenData {
  day: number;
  receitaAcum: number;
  breakEvenLine: number;
}

interface BreakEvenChartProps {
  data: BreakEvenData[];
  breakEvenValue: number;
  breakEvenDay: number | null;
}

export default function BreakEvenChart({ data, breakEvenValue, breakEvenDay }: BreakEvenChartProps) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#111] p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-medium text-zinc-400">Ponto de Equilíbrio</h3>
        <div className="text-right">
          <p className="text-xs text-zinc-500">Break-even: R$ {(breakEvenValue / 1000).toFixed(0)}k</p>
          {breakEvenDay && <p className="text-xs text-emerald-400">Atingido no dia {breakEvenDay}</p>}
          {!breakEvenDay && <p className="text-xs text-red-400">Não atingido no mês</p>}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis dataKey="day" tick={{ fill: "#71717a", fontSize: 11 }} tickLine={false} />
          <YAxis tick={{ fill: "#71717a", fontSize: 12 }} tickLine={false} tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} />
          <Tooltip
            contentStyle={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#fff" }}
            formatter={(value: unknown) => `R$ ${Number(value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
            labelFormatter={(label) => `Dia ${label}`}
          />
          <ReferenceLine y={breakEvenValue} stroke="#f59e0b" strokeDasharray="5 5" label={{ value: "Break-even", fill: "#f59e0b", fontSize: 11 }} />
          <Area type="monotone" dataKey="receitaAcum" stroke="#10b981" fill="#10b981" fillOpacity={0.15} strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
