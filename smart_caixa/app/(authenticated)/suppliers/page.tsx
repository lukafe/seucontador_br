"use client";

import { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import PeriodFilter, { type PeriodType, filterMonthsByPeriod } from "@/components/PeriodFilter";
import { formatCurrency, formatMonthYear } from "@/lib/format";
import type { MonthData, Entry } from "@/lib/calculations";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

const SupplierTrendChart = dynamic(() => import("@/components/Charts/SupplierTrendChart"), { ssr: false });

interface SupplierData {
  name: string;
  total: number;
  avgMonthly: number;
  monthCount: number;
  lastPurchase: string;
  trend: "up" | "down" | "stable";
  trendPct: number;
  monthlyTotals: Record<string, number>;
}

export default function SuppliersPage() {
  const [allMonths, setAllMonths] = useState<MonthData[]>([]);
  const [entriesByMonth, setEntriesByMonth] = useState<Record<number, Entry[]>>({});
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<PeriodType>("6m");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/months");
        const data = await res.json();
        if (!Array.isArray(data)) { setLoading(false); return; }
        setAllMonths(data);
        if (data.length > 0) setSelectedMonth(data[0].month_year);
        const map: Record<number, Entry[]> = {};
        for (const m of data) {
          const r = await fetch(`/api/entries?monthId=${m.id}`);
          const d = await r.json();
          if (Array.isArray(d)) map[m.id] = d;
        }
        setEntriesByMonth(map);
      } catch { /* empty */ } finally { setLoading(false); }
    }
    load();
  }, []);

  const monthsAsc = useMemo(() => [...allMonths].sort((a, b) => a.month_year.localeCompare(b.month_year)), [allMonths]);
  const allMonthKeys = useMemo(() => monthsAsc.map(m => m.month_year), [monthsAsc]);
  const filteredKeys = useMemo(() => filterMonthsByPeriod(allMonthKeys, period, selectedMonth), [allMonthKeys, period, selectedMonth]);
  const filteredMonths = useMemo(() => monthsAsc.filter(m => filteredKeys.includes(m.month_year)), [monthsAsc, filteredKeys]);

  // Build supplier data
  const suppliers = useMemo((): SupplierData[] => {
    const map = new Map<string, { total: number; months: Set<string>; lastDate: string; monthlyTotals: Record<string, number> }>();

    for (const m of filteredMonths) {
      const entries = (entriesByMonth[m.id] || []).filter(e => e.tipo === "Despesa" && e.descricao);
      for (const e of entries) {
        const name = e.descricao.trim().toLowerCase();
        if (!name) continue;
        const cur = map.get(name) || { total: 0, months: new Set(), lastDate: "", monthlyTotals: {} };
        cur.total += Number(e.valor);
        cur.months.add(m.month_year);
        cur.monthlyTotals[m.month_year] = (cur.monthlyTotals[m.month_year] || 0) + Number(e.valor);
        if (!cur.lastDate || e.data > cur.lastDate) cur.lastDate = e.data;
        map.set(name, cur);
      }
    }

    return Array.from(map.entries())
      .map(([name, data]) => {
        const monthKeys = Object.keys(data.monthlyTotals).sort();
        let trend: "up" | "down" | "stable" = "stable";
        let trendPct = 0;
        if (monthKeys.length >= 2) {
          const firstHalf = monthKeys.slice(0, Math.floor(monthKeys.length / 2));
          const secondHalf = monthKeys.slice(Math.floor(monthKeys.length / 2));
          const avgFirst = firstHalf.reduce((s, k) => s + (data.monthlyTotals[k] || 0), 0) / firstHalf.length;
          const avgSecond = secondHalf.reduce((s, k) => s + (data.monthlyTotals[k] || 0), 0) / secondHalf.length;
          if (avgFirst > 0) {
            trendPct = ((avgSecond - avgFirst) / avgFirst) * 100;
            trend = trendPct > 5 ? "up" : trendPct < -5 ? "down" : "stable";
          }
        }
        return {
          name: name.charAt(0).toUpperCase() + name.slice(1),
          total: data.total,
          avgMonthly: data.total / Math.max(data.months.size, 1),
          monthCount: data.months.size,
          lastPurchase: data.lastDate,
          trend,
          trendPct,
          monthlyTotals: data.monthlyTotals,
        };
      })
      .sort((a, b) => b.total - a.total);
  }, [filteredMonths, entriesByMonth]);

  // Concentration: top 10 = X% of total
  const totalAll = suppliers.reduce((s, sup) => s + sup.total, 0);
  const top10Total = suppliers.slice(0, 10).reduce((s, sup) => s + sup.total, 0);
  const concentrationPct = totalAll > 0 ? (top10Total / totalAll) * 100 : 0;

  // Chart data for selected supplier
  const chartData = useMemo(() => {
    if (!selectedSupplier) {
      // Top 5 suppliers trend
      const top5 = suppliers.slice(0, 5);
      return filteredKeys.map(key => {
        const point: Record<string, string | number> = { name: formatMonthYear(key) };
        top5.forEach(s => { point[s.name] = s.monthlyTotals[key] || 0; });
        return point;
      });
    }
    const sup = suppliers.find(s => s.name === selectedSupplier);
    if (!sup) return [];
    return filteredKeys.map(key => ({
      name: formatMonthYear(key),
      Valor: sup.monthlyTotals[key] || 0,
    }));
  }, [selectedSupplier, suppliers, filteredKeys]);

  if (loading) {
    return <div className="flex h-96 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" /></div>;
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Fornecedores</h1>
          <p className="mt-1 text-sm text-zinc-500">{suppliers.length} fornecedores no período</p>
        </div>
        <PeriodFilter selected={period} onChange={setPeriod} selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} availableMonths={[...allMonthKeys].reverse()} />
      </div>

      {/* Concentration KPI */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-white/[0.06] bg-[#111] p-5">
          <p className="text-sm text-zinc-400">Total Fornecedores</p>
          <p className="mt-1 text-2xl font-bold text-white">{formatCurrency(totalAll)}</p>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-[#111] p-5">
          <p className="text-sm text-zinc-400">Concentração Top 10</p>
          <p className={`mt-1 text-2xl font-bold ${concentrationPct > 80 ? "text-amber-400" : "text-white"}`}>{concentrationPct.toFixed(1)}%</p>
          <p className="mt-1 text-xs text-zinc-500">do custo total em 10 fornecedores</p>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-[#111] p-5">
          <p className="text-sm text-zinc-400">Fornecedores Ativos</p>
          <p className="mt-1 text-2xl font-bold text-white">{suppliers.length}</p>
        </div>
      </div>

      {/* Trend Chart */}
      {chartData.length > 0 && (
        <SupplierTrendChart
          data={chartData}
          supplierName={selectedSupplier || undefined}
          topSuppliers={selectedSupplier ? undefined : suppliers.slice(0, 5).map(s => s.name)}
        />
      )}

      {/* Table */}
      <div className="rounded-xl border border-white/[0.06] bg-[#111] p-5">
        <h3 className="mb-4 text-sm font-medium text-zinc-400">Ranking de Fornecedores</h3>
        <div className="max-h-[600px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-[#111]">
              <tr className="border-b border-white/[0.06]">
                <th className="pb-2 text-left text-xs font-medium text-zinc-500">#</th>
                <th className="pb-2 text-left text-xs font-medium text-zinc-500">Fornecedor</th>
                <th className="pb-2 text-right text-xs font-medium text-zinc-500">Total</th>
                <th className="pb-2 text-right text-xs font-medium text-zinc-500">% Custo</th>
                <th className="pb-2 text-right text-xs font-medium text-zinc-500">Média/mês</th>
                <th className="pb-2 text-right text-xs font-medium text-zinc-500">Meses</th>
                <th className="pb-2 text-right text-xs font-medium text-zinc-500">Tendência</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.slice(0, 50).map((sup, i) => (
                <tr
                  key={sup.name}
                  onClick={() => setSelectedSupplier(selectedSupplier === sup.name ? null : sup.name)}
                  className={`cursor-pointer border-b border-white/[0.03] transition-colors hover:bg-white/[0.04] ${selectedSupplier === sup.name ? "bg-emerald-500/5" : ""}`}
                >
                  <td className="py-2 text-zinc-500">{i + 1}</td>
                  <td className="py-2 font-medium text-zinc-300">{sup.name}</td>
                  <td className="py-2 text-right font-mono text-zinc-300">{formatCurrency(sup.total)}</td>
                  <td className="py-2 text-right font-mono text-zinc-500">{totalAll > 0 ? ((sup.total / totalAll) * 100).toFixed(1) : 0}%</td>
                  <td className="py-2 text-right font-mono text-zinc-400">{formatCurrency(sup.avgMonthly)}</td>
                  <td className="py-2 text-right text-zinc-400">{sup.monthCount}</td>
                  <td className="py-2 text-right">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                      sup.trend === "up" ? "text-red-400" : sup.trend === "down" ? "text-emerald-400" : "text-zinc-400"
                    }`}>
                      {sup.trend === "up" ? <TrendingUp className="h-3 w-3" /> : sup.trend === "down" ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                      {Math.abs(sup.trendPct).toFixed(0)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
