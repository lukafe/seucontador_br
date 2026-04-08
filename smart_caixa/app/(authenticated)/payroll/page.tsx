"use client";

import { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import PeriodFilter, { type PeriodType, filterMonthsByPeriod } from "@/components/PeriodFilter";
import KPICard, { computeTrend } from "@/components/KPICard";
import { formatCurrency, formatPercent, formatMonthYear } from "@/lib/format";
import type { MonthData, Entry } from "@/lib/calculations";
import { Users, DollarSign, Percent } from "lucide-react";

const PayrollTrendChart = dynamic(() => import("@/components/Charts/PayrollTrendChart"), { ssr: false });

const PAYROLL_CATEGORIES = ["Salários e Encargos", "Comissões", "Pró-Labore", "Premiação", "Mão de Obra Direta"];

export default function PayrollPage() {
  const [allMonths, setAllMonths] = useState<MonthData[]>([]);
  const [entriesByMonth, setEntriesByMonth] = useState<Record<number, Entry[]>>({});
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<PeriodType>("6m");
  const [selectedMonth, setSelectedMonth] = useState("");

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

  // Payroll entries
  const payrollEntries = useMemo(() => {
    return filteredMonths.flatMap(m => (entriesByMonth[m.id] || []).filter(e => PAYROLL_CATEGORIES.includes(e.subcategoria)));
  }, [filteredMonths, entriesByMonth]);

  const totalPayroll = payrollEntries.reduce((s, e) => s + Number(e.valor), 0);
  const totalReceita = filteredMonths.reduce((s, m) => s + Number(m.receita_total), 0);
  const payrollPct = totalReceita > 0 ? totalPayroll / totalReceita : 0;

  // By category breakdown
  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    PAYROLL_CATEGORIES.forEach(c => map.set(c, 0));
    payrollEntries.forEach(e => map.set(e.subcategoria, (map.get(e.subcategoria) || 0) + Number(e.valor)));
    return Array.from(map.entries()).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  }, [payrollEntries]);

  // By employee (description)
  const byEmployee = useMemo(() => {
    const map = new Map<string, { total: number; category: string }>();
    payrollEntries.filter(e => e.descricao).forEach(e => {
      const name = e.descricao.trim();
      const cur = map.get(name) || { total: 0, category: e.subcategoria };
      cur.total += Number(e.valor);
      map.set(name, cur);
    });
    return Array.from(map.entries()).sort((a, b) => b[1].total - a[1].total);
  }, [payrollEntries]);

  // Trend chart data
  const trendData = useMemo(() => {
    return filteredMonths.map(m => {
      const entries = (entriesByMonth[m.id] || []).filter(e => PAYROLL_CATEGORIES.includes(e.subcategoria));
      const point: Record<string, string | number> = { name: formatMonthYear(m.month_year) };
      PAYROLL_CATEGORIES.forEach(cat => {
        const total = entries.filter(e => e.subcategoria === cat).reduce((s, e) => s + Number(e.valor), 0);
        if (total > 0) point[cat] = total;
      });
      point["% Receita"] = Number(m.receita_total) > 0
        ? Number(((entries.reduce((s, e) => s + Number(e.valor), 0) / Number(m.receita_total)) * 100).toFixed(1))
        : 0;
      return point;
    });
  }, [filteredMonths, entriesByMonth]);

  // Previous period for trend
  const prevPayroll = useMemo(() => {
    const len = filteredMonths.length;
    const startIdx = monthsAsc.indexOf(filteredMonths[0]);
    if (startIdx <= 0) return null;
    const prev = monthsAsc.slice(Math.max(0, startIdx - len), startIdx);
    const entries = prev.flatMap(m => (entriesByMonth[m.id] || []).filter(e => PAYROLL_CATEGORIES.includes(e.subcategoria)));
    return entries.reduce((s, e) => s + Number(e.valor), 0);
  }, [filteredMonths, monthsAsc, entriesByMonth]);

  const payrollTrend = computeTrend(totalPayroll, prevPayroll);

  if (loading) {
    return <div className="flex h-96 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" /></div>;
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Pessoal</h1>
          <p className="mt-1 text-sm text-zinc-500">Análise de custos com pessoal</p>
        </div>
        <PeriodFilter selected={period} onChange={setPeriod} selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} availableMonths={[...allMonthKeys].reverse()} />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <KPICard title="Custo Total Pessoal" value={formatCurrency(totalPayroll)} icon={<Users className="h-5 w-5" />} variant="default" trend={payrollTrend?.trend} trendValue={payrollTrend?.trendValue} />
        <KPICard title="% da Receita" value={formatPercent(payrollPct)} icon={<Percent className="h-5 w-5" />} variant={payrollPct <= 0.35 ? "positive" : payrollPct <= 0.40 ? "warning" : "negative"} subtitle="Ideal: 28-35%" />
        <KPICard title="Receita / Pessoal" value={`${totalPayroll > 0 ? (totalReceita / totalPayroll).toFixed(1) : "—"}x`} icon={<DollarSign className="h-5 w-5" />} subtitle="produtividade" />
      </div>

      {/* Breakdown by category */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-white/[0.06] bg-[#111] p-5">
          <h3 className="mb-4 text-sm font-medium text-zinc-400">Composição por Tipo</h3>
          <div className="space-y-3">
            {byCategory.map(([cat, total]) => (
              <div key={cat}>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-300">{cat}</span>
                  <span className="font-mono text-zinc-300">{formatCurrency(total)}</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-white/[0.06]">
                  <div
                    className="h-full rounded-full bg-emerald-500"
                    style={{ width: `${totalPayroll > 0 ? (total / totalPayroll) * 100 : 0}%` }}
                  />
                </div>
                <p className="mt-0.5 text-right text-xs text-zinc-500">{totalPayroll > 0 ? ((total / totalPayroll) * 100).toFixed(1) : 0}%</p>
              </div>
            ))}
          </div>
        </div>

        {/* Trend chart */}
        {trendData.length > 0 && <PayrollTrendChart data={trendData} categories={byCategory.map(([c]) => c)} />}
      </div>

      {/* By employee */}
      <div className="rounded-xl border border-white/[0.06] bg-[#111] p-5">
        <h3 className="mb-4 text-sm font-medium text-zinc-400">Por Funcionário / Descrição ({byEmployee.length})</h3>
        <div className="max-h-[500px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-[#111]">
              <tr className="border-b border-white/[0.06]">
                <th className="pb-2 text-left text-xs font-medium text-zinc-500">#</th>
                <th className="pb-2 text-left text-xs font-medium text-zinc-500">Nome</th>
                <th className="pb-2 text-left text-xs font-medium text-zinc-500">Tipo</th>
                <th className="pb-2 text-right text-xs font-medium text-zinc-500">Total</th>
                <th className="pb-2 text-right text-xs font-medium text-zinc-500">% Pessoal</th>
              </tr>
            </thead>
            <tbody>
              {byEmployee.map(([name, { total, category }], i) => (
                <tr key={name} className="border-b border-white/[0.03]">
                  <td className="py-2 text-zinc-500">{i + 1}</td>
                  <td className="py-2 font-medium text-zinc-300">{name}</td>
                  <td className="py-2 text-xs text-zinc-400">{category}</td>
                  <td className="py-2 text-right font-mono text-zinc-300">{formatCurrency(total)}</td>
                  <td className="py-2 text-right font-mono text-zinc-500">{totalPayroll > 0 ? ((total / totalPayroll) * 100).toFixed(1) : 0}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
