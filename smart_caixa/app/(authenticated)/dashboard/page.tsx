"use client";

import { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import KPICard, { computeTrend } from "@/components/KPICard";
import PeriodFilter, { type PeriodType, filterMonthsByPeriod } from "@/components/PeriodFilter";
import { formatCurrency, formatPercent, formatMonthYear } from "@/lib/format";
import {
  calculateCMV,
  calculateCustoPessoal,
  getAlerts,
  type MonthData,
  type Entry,
} from "@/lib/calculations";
import {
  DollarSign,
  TrendingDown,
  TrendingUp,
  Percent,
  Wallet,
  CreditCard,
  AlertTriangle,
} from "lucide-react";

const RevenueExpenseChart = dynamic(() => import("@/components/Charts/RevenueExpenseChart"), { ssr: false });
const MarginChart = dynamic(() => import("@/components/Charts/MarginChart"), { ssr: false });
const ExpenseCompositionChart = dynamic(() => import("@/components/Charts/ExpenseCompositionChart"), { ssr: false });
const DailyRevenueChart = dynamic(() => import("@/components/Charts/DailyRevenueChart"), { ssr: false });
const StackedExpenseChart = dynamic(() => import("@/components/Charts/StackedExpenseChart"), { ssr: false });
const CashFlowChart = dynamic(() => import("@/components/Charts/CashFlowChart"), { ssr: false });

export default function DashboardPage() {
  const [allMonths, setAllMonths] = useState<MonthData[]>([]);
  const [entriesByMonth, setEntriesByMonth] = useState<Record<number, Entry[]>>({});
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<PeriodType>("all");
  const [selectedMonth, setSelectedMonth] = useState<string>("");

  useEffect(() => {
    async function load() {
      try {
        const monthsRes = await fetch("/api/months");
        const monthsData = await monthsRes.json();
        if (!Array.isArray(monthsData)) { setLoading(false); return; }
        setAllMonths(monthsData);

        if (monthsData.length > 0) {
          setSelectedMonth(monthsData[0].month_year);
          // Load entries for all months
          const entriesMap: Record<number, Entry[]> = {};
          for (const m of monthsData) {
            const res = await fetch(`/api/entries?monthId=${m.id}`);
            const data = await res.json();
            if (Array.isArray(data)) entriesMap[m.id] = data;
          }
          setEntriesByMonth(entriesMap);
        }
      } catch (err) {
        console.error("Error loading dashboard:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Sort months ascending
  const monthsAsc = useMemo(() => [...allMonths].sort((a, b) => a.month_year.localeCompare(b.month_year)), [allMonths]);
  const allMonthKeys = useMemo(() => monthsAsc.map((m) => m.month_year), [monthsAsc]);

  // Filter months by period
  const filteredKeys = useMemo(() => filterMonthsByPeriod(allMonthKeys, period, selectedMonth), [allMonthKeys, period, selectedMonth]);
  const filteredMonths = useMemo(() => monthsAsc.filter((m) => filteredKeys.includes(m.month_year)), [monthsAsc, filteredKeys]);

  // Aggregate KPIs for the filtered period
  const aggregated = useMemo(() => {
    if (filteredMonths.length === 0) return null;

    const receita = filteredMonths.reduce((s, m) => s + Number(m.receita_total), 0);
    const despesa = filteredMonths.reduce((s, m) => s + Number(m.despesa_total), 0);
    const lucro = filteredMonths.reduce((s, m) => s + Number(m.lucro_liquido), 0);
    const margem = receita > 0 ? lucro / receita : 0;
    const latest = filteredMonths[filteredMonths.length - 1];
    const saldoFinal = Number(latest.saldo_final);
    const recebiveis = Number(latest.recebiveis_cartao);

    // All entries in the period
    const periodEntries = filteredMonths.flatMap((m) => entriesByMonth[m.id] || []);
    const cmv = calculateCMV(periodEntries, receita);
    const custoPessoal = calculateCustoPessoal(periodEntries, receita);
    const alerts = period === "1m" ? getAlerts(latest, entriesByMonth[latest.id] || []) : [];

    return { receita, despesa, lucro, margem, cmv, custoPessoal, saldoFinal, recebiveis, alerts, periodEntries, latest };
  }, [filteredMonths, entriesByMonth, period]);

  // Previous period for comparison
  const previousAggregated = useMemo(() => {
    if (filteredMonths.length === 0) return null;

    const periodLen = filteredMonths.length;
    const startIdx = monthsAsc.indexOf(filteredMonths[0]);
    const prevMonths = monthsAsc.slice(Math.max(0, startIdx - periodLen), startIdx);
    if (prevMonths.length === 0) return null;

    const receita = prevMonths.reduce((s, m) => s + Number(m.receita_total), 0);
    const despesa = prevMonths.reduce((s, m) => s + Number(m.despesa_total), 0);
    const lucro = prevMonths.reduce((s, m) => s + Number(m.lucro_liquido), 0);
    const margem = receita > 0 ? lucro / receita : 0;
    const prevEntries = prevMonths.flatMap((m) => entriesByMonth[m.id] || []);
    const cmv = calculateCMV(prevEntries, receita);
    const custoPessoal = calculateCustoPessoal(prevEntries, receita);

    return { receita, despesa, lucro, margem, cmv, custoPessoal };
  }, [filteredMonths, monthsAsc, entriesByMonth]);

  // Categories for expense composition (latest in filter)
  const categories = useMemo(() => {
    if (!aggregated) return [];
    const catMap = new Map<string, number>();
    aggregated.periodEntries
      .filter((e) => e.tipo === "Despesa")
      .forEach((e) => catMap.set(e.subcategoria, (catMap.get(e.subcategoria) || 0) + Number(e.valor)));
    return Array.from(catMap.entries())
      .map(([subcategoria, total]) => ({ subcategoria, total }))
      .sort((a, b) => b.total - a.total);
  }, [aggregated]);

  // Stacked expense data
  const stackedData = useMemo(() => {
    return filteredMonths.map((m) => {
      const entries = entriesByMonth[m.id] || [];
      const cats: Record<string, number> = {};
      entries.filter((e) => e.tipo === "Despesa").forEach((e) => {
        cats[e.subcategoria] = (cats[e.subcategoria] || 0) + Number(e.valor);
      });
      return { month_year: m.month_year, categories: cats };
    });
  }, [filteredMonths, entriesByMonth]);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  if (allMonths.length === 0) {
    return (
      <div className="flex h-96 flex-col items-center justify-center text-center">
        <Wallet className="h-16 w-16 text-zinc-600" />
        <h2 className="mt-4 text-xl font-semibold text-zinc-300">Nenhum mês carregado</h2>
        <p className="mt-2 text-sm text-zinc-500">Faça upload de um arquivo Excel na página de Upload para começar.</p>
        <a href="/upload" className="mt-4 rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-emerald-500">Fazer Upload</a>
      </div>
    );
  }

  if (!aggregated) return null;

  const { receita, despesa, lucro, margem, cmv, custoPessoal, saldoFinal, recebiveis, alerts, periodEntries, latest } = aggregated;

  // Compute trends
  const receitaTrend = computeTrend(receita, previousAggregated?.receita);
  const despesaTrend = computeTrend(despesa, previousAggregated?.despesa);
  const lucroTrend = computeTrend(lucro, previousAggregated?.lucro);
  const margemDelta = previousAggregated ? {
    trend: (margem - previousAggregated.margem) > 0 ? "up" as const : (margem - previousAggregated.margem) < -0.005 ? "down" as const : "neutral" as const,
    trendValue: `${((margem - previousAggregated.margem) * 100).toFixed(1)} p.p.`,
  } : null;

  const periodLabel = period === "1m" ? formatMonthYear(selectedMonth || latest.month_year) : period === "3m" ? "Últimos 3 meses" : period === "6m" ? "Últimos 6 meses" : period === "1y" ? "Último ano" : `${filteredMonths.length} meses`;

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="mt-1 text-sm text-zinc-500">{periodLabel}</p>
        </div>
        <PeriodFilter
          selected={period}
          onChange={setPeriod}
          selectedMonth={selectedMonth}
          onMonthChange={setSelectedMonth}
          availableMonths={[...allMonthKeys].reverse()}
        />
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <div className="flex items-center gap-2 text-amber-400">
            <AlertTriangle className="h-5 w-5" />
            <span className="text-sm font-semibold">Alertas</span>
          </div>
          <ul className="mt-2 space-y-1">
            {alerts.map((alert, i) => (
              <li key={i} className="text-sm text-amber-300/80">• {alert}</li>
            ))}
          </ul>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KPICard
          title="Receita Bruta"
          value={formatCurrency(receita)}
          icon={<DollarSign className="h-5 w-5" />}
          variant="positive"
          trend={receitaTrend?.trend}
          trendValue={receitaTrend?.trendValue}
          previousValue={previousAggregated ? formatCurrency(previousAggregated.receita) : undefined}
        />
        <KPICard
          title="Despesas Totais"
          value={formatCurrency(despesa)}
          icon={<TrendingDown className="h-5 w-5" />}
          variant="negative"
          trend={despesaTrend ? (despesaTrend.trend === "up" ? "down" : "up") : undefined}
          trendValue={despesaTrend?.trendValue}
          previousValue={previousAggregated ? formatCurrency(previousAggregated.despesa) : undefined}
        />
        <KPICard
          title="Lucro Líquido"
          value={formatCurrency(lucro)}
          icon={<TrendingUp className="h-5 w-5" />}
          variant={lucro >= 0 ? "positive" : "negative"}
          trend={lucroTrend?.trend}
          trendValue={lucroTrend?.trendValue}
          previousValue={previousAggregated ? formatCurrency(previousAggregated.lucro) : undefined}
        />
        <KPICard
          title="Margem Líquida"
          value={formatPercent(margem)}
          icon={<Percent className="h-5 w-5" />}
          variant={margem >= 0.1 ? "positive" : margem >= 0.05 ? "warning" : "negative"}
          trend={margemDelta?.trend}
          trendValue={margemDelta?.trendValue}
          previousValue={previousAggregated ? formatPercent(previousAggregated.margem) : undefined}
        />
        <KPICard
          title="CMV / Receita"
          value={formatPercent(cmv)}
          subtitle="Ideal: 30-40%"
          variant={cmv <= 0.4 ? "positive" : "negative"}
        />
        <KPICard
          title="Custo Pessoal / Receita"
          value={formatPercent(custoPessoal)}
          subtitle="Ideal: 28-35%"
          variant={custoPessoal <= 0.35 ? "positive" : "warning"}
        />
        <KPICard
          title="Saldo de Caixa"
          value={formatCurrency(saldoFinal)}
          icon={<Wallet className="h-5 w-5" />}
        />
        <KPICard
          title="Recebíveis Cartão"
          value={formatCurrency(recebiveis)}
          icon={<CreditCard className="h-5 w-5" />}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <RevenueExpenseChart data={filteredMonths} />
        <MarginChart data={filteredMonths} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {stackedData.length > 0 && <StackedExpenseChart data={stackedData} />}
        {categories.length > 0 && <ExpenseCompositionChart data={categories} />}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {periodEntries.length > 0 && <DailyRevenueChart entries={periodEntries} />}
        <CashFlowChart data={filteredMonths} />
      </div>
    </div>
  );
}
