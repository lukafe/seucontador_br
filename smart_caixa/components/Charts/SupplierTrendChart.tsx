"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"];

interface SupplierTrendChartProps {
  data: Record<string, string | number>[];
  supplierName?: string;
  topSuppliers?: string[];
}

export default function SupplierTrendChart({ data, supplierName, topSuppliers }: SupplierTrendChartProps) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#111] p-5">
      <h3 className="mb-4 text-sm font-medium text-zinc-400">
        {supplierName ? `Evolução — ${supplierName}` : "Evolução Top 5 Fornecedores"}
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis dataKey="name" tick={{ fill: "#71717a", fontSize: 11 }} tickLine={false} />
          <YAxis tick={{ fill: "#71717a", fontSize: 12 }} tickLine={false} tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} />
          <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#fff" }} formatter={(value: unknown) => `R$ ${Number(value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} />
          <Legend wrapperStyle={{ fontSize: "11px" }} />
          {supplierName ? (
            <Line type="monotone" dataKey="Valor" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
          ) : (
            topSuppliers?.map((name, i) => (
              <Line key={name} type="monotone" dataKey={name} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={{ r: 3 }} />
            ))
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
