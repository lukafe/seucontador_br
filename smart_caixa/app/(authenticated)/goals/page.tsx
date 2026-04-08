"use client";

import { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import PeriodFilter, { type PeriodType, filterMonthsByPeriod } from "@/components/PeriodFilter";
import { formatCurrency, formatPercent, formatMonthYear } from "@/lib/format";
import type { MonthData, Entry } from "@/lib/calculations";
import { Target, TrendingUp, BarChart3 } from "lucide-react";

const ParetoChart = dynamic(() => import("@/components/Charts/ParetoChart"), { ssr: false });
const BreakEvenChart = dynamic(() => import("@/components/Charts/BreakEvenChart"), { ssr: false });
const ForecastChart = dynamic(() => import("@/components/Charts/ForecastChart"), { ssr: false });

export default function GoalsPage() {
  const [allMonths, setAllMonths] = useState<MonthData[]>([]);
  const [entriesByMonth, setEntriesByMonth] = useState<Record<number, Entry[]>>({});
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<PeriodType>("1m");
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
  const periodEntries = useMemo(() => filteredMonths.flatMap(m => entriesByMonth[m.id] || []), [filteredMonths, entriesByMonth]);

  // === PARETO DATA ===
  const paretoData = useMemo(() => {
    const catMap = new Map<string, number>();
    periodEntries.filter(e => e.tipo === "Despesa").forEach(e => {
      catMap.set(e.subcategoria, (catMap.get(e.subcategoria) || 0) + Number(e.valor));
    });
    const sorted = Array.from(catMap.entries()).sort((a, b) => b[1] - a[1]);
    const total = sorted.reduce((s, [, v]) => s + v, 0);

    let cumSum = 0;
    return sorted.map(([name, value]) => {
      cumSum += value;
      const cumPct = total > 0 ? (cumSum / total) * 100 : 0;
      return {
        name,
        value,
        cumulative: Number(cumPct.toFixed(1)),
        class: (cumPct <= 80 ? "A" : cumPct <= 95 ? "B" : "C") as "A" | "B" | "C",
      };
    });
  }, [periodEntries]);

  // === BREAK-EVEN DATA ===
  const breakEvenData = useMemo(() => {
    const latest = filteredMonths.length > 0 ? filteredMonths[filteredMonths.length - 1] : null;
    if (!latest) return { data: [], breakEvenValue: 0, breakEvenDay: null as number | null };

    const entries = entriesByMonth[latest.id] || [];
    const custoFixo = entries.filter(e => e.tipo === "Despesa" && ["Salários e Encargos", "Comissões", "Pró-Labore", "Aluguel", "Contas de Consumo", "Manutenção", "Despesas Bancárias"].includes(e.subcategoria)).reduce((s, e) => s + Number(e.valor), 0);
    const receita = Number(latest.receita_total);
    const cmvTotal = entries.filter(e => ["Matéria-Prima", "Embalagens"].includes(e.subcategoria)).reduce((s, e) => s + Number(e.valor), 0);
    const cmvPct = receita > 0 ? cmvTotal / receita : 0.35;
    const breakEvenValue = cmvPct < 1 ? custoFixo / (1 - cmvPct) : custoFixo * 2;

    // Daily cumulative revenue
    const dailyMap = new Map<number, number>();
    entries.filter(e => e.tipo === "Receita").forEach(e => {
      const day = new Date(e.data).getDate();
      dailyMap.set(day, (dailyMap.get(day) || 0) + Number(e.valor));
    });

    let cumRev = 0;
    let breakEvenDay: number | null = null;
    const data = Array.from(dailyMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([day, rev]) => {
        cumRev += rev;
        if (!breakEvenDay && cumRev >= breakEvenValue) breakEvenDay = day;
        return { day, receitaAcum: cumRev, breakEvenLine: breakEvenValue };
      });

    return { data, breakEvenValue, breakEvenDay };
  }, [filteredMonths, entriesByMonth]);

  // === FORECAST DATA ===
  const forecastData = useMemo(() => {
    if (monthsAsc.length < 3) return [];

    const values = monthsAsc.map(m => Number(m.receita_total));
    const n = values.length;

    // Linear regression
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    values.forEach((y, x) => { sumX += x; sumY += y; sumXY += x * y; sumX2 += x * x; });
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Std deviation for bands
    const predicted = values.map((_, i) => intercept + slope * i);
    const residuals = values.map((v, i) => v - predicted[i]);
    const stdDev = Math.sqrt(residuals.reduce((s, r) => s + r * r, 0) / n);

    const result = monthsAsc.map((m, i) => ({
      name: formatMonthYear(m.month_year),
      Real: Number(m.receita_total),
    }));

    // Add 3 months of forecast
    const lastMonth = monthsAsc[n - 1].month_year;
    const [ly, lm] = lastMonth.split("-").map(Number);
    for (let i = 1; i <= 3; i++) {
      const futureDate = new Date(ly, lm - 1 + i, 1);
      const label = `${futureDate.toLocaleString("pt-BR", { month: "short" })}/${futureDate.getFullYear()}`;
      const forecast = intercept + slope * (n - 1 + i);
      result.push({
        name: label,
        Real: undefined as unknown as number,
        "Projeção": Math.max(0, Math.round(forecast)),
        "Otimista": Math.max(0, Math.round(forecast + stdDev)),
        "Pessimista": Math.max(0, Math.round(forecast - stdDev)),
      } as Record<string, unknown> as typeof result[0]);
    }
    // Add projection lines on last real month
    const lastReal = result[n - 1];
    (lastReal as Record<string, unknown>)["Projeção"] = lastReal.Real;

    return result;
  }, [monthsAsc]);

  // === GOALS TRACKING ===
  const goals = useMemo(() => {
    const latest = filteredMonths.length > 0 ? filteredMonths[filteredMonths.length - 1] : null;
    if (!latest) return [];
    const entries = entriesByMonth[latest.id] || [];
    const receita = Number(latest.receita_total);
    const cmv = entries.filter(e => ["Matéria-Prima", "Embalagens"].includes(e.subcategoria)).reduce((s, e) => s + Number(e.valor), 0);
    const pessoal = entries.filter(e => ["Salários e Encargos", "Comissões", "Pró-Labore"].includes(e.subcategoria)).reduce((s, e) => s + Number(e.valor), 0);

    return [
      { label: "Faturamento", current: receita, target: 700000, format: formatCurrency, unit: "" },
      { label: "Margem Líquida", current: Number(latest.margem_liquida) * 100, target: 10, format: (v: number) => `${v.toFixed(1)}%`, unit: "%" },
      { label: "CMV / Receita", current: receita > 0 ? (cmv / receita) * 100 : 0, target: 35, format: (v: number) => `${v.toFixed(1)}%`, unit: "%", inverted: true },
      { label: "Pessoal / Receita", current: receita > 0 ? (pessoal / receita) * 100 : 0, target: 32, format: (v: number) => `${v.toFixed(1)}%`, unit: "%", inverted: true },
    ];
  }, [filteredMonths, entriesByMonth]);

  if (loading) {
    return <div className="flex h-96 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" /></div>;
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Estratégico</h1>
          <p className="mt-1 text-sm text-zinc-500">Pareto, Break-even, Projeções e Metas</p>
        </div>
        <PeriodFilter selected={period} onChange={setPeriod} selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} availableMonths={[...allMonthKeys].reverse()} />
      </div>

      {/* Goals */}
      <div className="rounded-xl border border-white/[0.06] bg-[#111] p-5">
        <div className="mb-4 flex items-center gap-2">
          <Target className="h-5 w-5 text-emerald-400" />
          <h3 className="text-sm font-medium text-zinc-400">Metas do Mês</h3>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {goals.map((g) => {
            const pct = g.inverted
              ? (g.current <= g.target ? 100 : Math.max(0, (1 - (g.current - g.target) / g.target) * 100))
              : Math.min(100, (g.current / g.target) * 100);
            const isGood = g.inverted ? g.current <= g.target : g.current >= g.target;
            return (
              <div key={g.label} className="rounded-lg border border-white/[0.04] bg-white/[0.02] p-4">
                <p className="text-xs text-zinc-500">{g.label}</p>
                <p className={`mt-1 text-xl font-bold ${isGood ? "text-emerald-400" : "text-amber-400"}`}>{g.format(g.current)}</p>
                <div className="mt-2 h-2 rounded-full bg-white/[0.06]">
                  <div className={`h-full rounded-full transition-all ${isGood ? "bg-emerald-500" : "bg-amber-500"}`} style={{ width: `${Math.min(100, pct)}%` }} />
                </div>
                <p className="mt-1 text-xs text-zinc-500">Meta: {g.format(g.target)} ({pct.toFixed(0)}%)</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pareto */}
      {paretoData.length > 0 && <ParetoChart data={paretoData} />}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Break-even */}
        {breakEvenData.data.length > 0 && (
          <BreakEvenChart data={breakEvenData.data} breakEvenValue={breakEvenData.breakEvenValue} breakEvenDay={breakEvenData.breakEvenDay} />
        )}

        {/* ABC Summary */}
        <div className="rounded-xl border border-white/[0.06] bg-[#111] p-5">
          <div className="mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-400" />
            <h3 className="text-sm font-medium text-zinc-400">Classificação ABC</h3>
          </div>
          <div className="space-y-3">
            {["A", "B", "C"].map(cls => {
              const items = paretoData.filter(d => d.class === cls);
              const total = items.reduce((s, d) => s + d.value, 0);
              const color = cls === "A" ? "text-red-400 bg-red-500/10" : cls === "B" ? "text-amber-400 bg-amber-500/10" : "text-blue-400 bg-blue-500/10";
              return (
                <div key={cls} className={`rounded-lg p-3 ${color.split(" ")[1]}`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-bold ${color.split(" ")[0]}`}>Classe {cls}</span>
                    <span className="text-sm font-mono text-zinc-300">{formatCurrency(total)}</span>
                  </div>
                  <p className="mt-1 text-xs text-zinc-400">
                    {items.length} {items.length === 1 ? "categoria" : "categorias"}: {items.map(d => d.name).join(", ")}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Forecast */}
      {forecastData.length > 0 && (
        <>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-400" />
            <h3 className="text-sm font-medium text-zinc-400">Projeção de Receita (3 meses)</h3>
          </div>
          <ForecastChart data={forecastData} label="Receita" />
        </>
      )}
    </div>
  );
}
