"use client";

import {
  AreaChart,
  Area,
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
  saldo_final: number;
  caixa_banco: number;
  caixa_cdb: number;
  recebiveis_cartao: number;
  caixa_dinheiro: number;
}

export default function CashFlowChart({ data }: { data: MonthData[] }) {
  const chartData = data.map((m) => ({
    name: formatMonthYear(m.month_year),
    "Saldo Total": Number(m.saldo_final),
    Banco: Number(m.caixa_banco),
    CDB: Number(m.caixa_cdb),
    "Recebíveis": Number(m.recebiveis_cartao),
    Dinheiro: Number(m.caixa_dinheiro),
  }));

  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#111] p-5">
      <h3 className="mb-4 text-sm font-medium text-zinc-400">
        Fluxo de Caixa
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis dataKey="name" tick={{ fill: "#71717a", fontSize: 11 }} tickLine={false} />
          <YAxis tick={{ fill: "#71717a", fontSize: 12 }} tickLine={false} tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} />
          <Tooltip
            contentStyle={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#fff" }}
            formatter={(value: unknown) => `R$ ${Number(value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
          />
          <Legend wrapperStyle={{ fontSize: "11px" }} />
          <Area type="monotone" dataKey="CDB" stackId="1" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} />
          <Area type="monotone" dataKey="Banco" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
          <Area type="monotone" dataKey="Recebíveis" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.3} />
          <Area type="monotone" dataKey="Dinheiro" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
