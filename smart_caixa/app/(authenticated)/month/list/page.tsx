"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatCurrency, formatPercent, formatMonthYear } from "@/lib/format";
import { Calendar, ChevronRight, Trash2 } from "lucide-react";

interface MonthItem {
  id: number;
  month_year: string;
  file_name: string;
  receita_total: number;
  despesa_total: number;
  lucro_liquido: number;
  margem_liquida: number;
  uploaded_at: string;
}

export default function MonthListPage() {
  const [months, setMonths] = useState<MonthItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/months")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setMonths(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Deseja realmente excluir ${name}?`)) return;
    await fetch(`/api/months?id=${id}`, { method: "DELETE" });
    setMonths((prev) => prev.filter((m) => m.id !== id));
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Histórico</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {months.length} {months.length === 1 ? "mês carregado" : "meses carregados"}
          </p>
        </div>
        <Link
          href="/upload"
          className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-500"
        >
          Novo Upload
        </Link>
      </div>

      {months.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center text-center">
          <Calendar className="h-12 w-12 text-zinc-600" />
          <p className="mt-3 text-sm text-zinc-400">Nenhum mês carregado ainda</p>
        </div>
      ) : (
        <div className="space-y-3">
          {months.map((m) => (
            <div
              key={m.id}
              className="group flex items-center justify-between rounded-xl border border-white/[0.06] bg-[#111] p-5 transition-all hover:border-white/[0.12]"
            >
              <Link href={`/month/${m.id}`} className="flex flex-1 items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                  <Calendar className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-white">
                    {formatMonthYear(m.month_year)}
                  </p>
                  <p className="text-xs text-zinc-500">{m.file_name}</p>
                </div>
                <div className="hidden gap-8 md:flex">
                  <div className="text-right">
                    <p className="text-xs text-zinc-500">Receita</p>
                    <p className="font-semibold text-emerald-400">
                      {formatCurrency(Number(m.receita_total))}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-zinc-500">Lucro</p>
                    <p className={`font-semibold ${Number(m.lucro_liquido) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {formatCurrency(Number(m.lucro_liquido))}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-zinc-500">Margem</p>
                    <p className="font-semibold text-zinc-300">
                      {formatPercent(Number(m.margem_liquida))}
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-zinc-500 group-hover:text-zinc-300" />
              </Link>
              <button
                onClick={() => handleDelete(m.id, formatMonthYear(m.month_year))}
                className="ml-3 rounded-lg p-2 text-zinc-600 hover:bg-red-500/10 hover:text-red-400"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
