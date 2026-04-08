"use client";

import { useEffect, useState } from "react";
import KPICard from "@/components/KPICard";
import RevenueExpenseChart from "@/components/Charts/RevenueExpenseChart";
import MarginChart from "@/components/Charts/MarginChart";
import ExpenseCompositionChart from "@/components/Charts/ExpenseCompositionChart";
import DailyRevenueChart from "@/components/Charts/DailyRevenueChart";
import StackedExpenseChart from "@/components/Charts/StackedExpenseChart";
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

export default function DashboardPage() {
  const [months, setMonths] = useState<MonthData[]>([]);
  const [latestEntries, setLatestEntries] = useState<Entry[]>([]);
  const [categories, setCategories] = useState<{ subcategoria: string; total: number }[]>([]);
  const [stackedData, setStackedData] = useState<{ month_year: string; categories: Record<string, number> }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const monthsRes = await fetch("/api/months");
        const monthsData = await monthsRes.json();
        setMonths(monthsData);

        if (monthsData.length > 0) {
          const latest = monthsData[0]; // DESC order, first is newest
          const entriesRes = await fetch(`/api/entries?monthId=${latest.id}`);
          const entriesData = await entriesRes.json();
          setLatestEntries(entriesData);

          // Get category summaries for latest month
          const catRes = await fetch(`/api/entries?monthId=${latest.id}&categoria=all`);
          // Build categories from entries
          const catMap = new Map<string, number>();
          entriesData
            .filter((e: Entry) => e.tipo === "Despesa")
            .forEach((e: Entry) => {
              catMap.set(e.subcategoria, (catMap.get(e.subcategoria) || 0) + Number(e.valor));
            });
          setCategories(
            Array.from(catMap.entries()).map(([subcategoria, total]) => ({
              subcategoria,
              total,
            }))
          );

          // Build stacked data for all months
          const stacked = [];
          for (const m of [...monthsData].reverse()) {
            const mEntries = await fetch(`/api/entries?monthId=${m.id}`);
            const mData = await mEntries.json();
            const cats: Record<string, number> = {};
            mData
              .filter((e: Entry) => e.tipo === "Despesa")
              .forEach((e: Entry) => {
                cats[e.subcategoria] = (cats[e.subcategoria] || 0) + Number(e.valor);
              });
            stacked.push({ month_year: m.month_year, categories: cats });
          }
          setStackedData(stacked);
        }
      } catch (err) {
        console.error("Error loading dashboard:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  if (months.length === 0) {
    return (
      <div className="flex h-96 flex-col items-center justify-center text-center">
        <Wallet className="h-16 w-16 text-zinc-600" />
        <h2 className="mt-4 text-xl font-semibold text-zinc-300">
          Nenhum mês carregado
        </h2>
        <p className="mt-2 text-sm text-zinc-500">
          Faça upload de um arquivo Excel na página de Upload para começar.
        </p>
        <a
          href="/upload"
          className="mt-4 rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-emerald-500"
        >
          Fazer Upload
        </a>
      </div>
    );
  }

  const latest = months[0];
  const receita = Number(latest.receita_total);
  const despesa = Number(latest.despesa_total);
  const lucro = Number(latest.lucro_liquido);
  const margem = Number(latest.margem_liquida);
  const cmv = calculateCMV(latestEntries, receita);
  const custoPessoal = calculateCustoPessoal(latestEntries, receita);
  const saldoFinal = Number(latest.saldo_final);
  const recebiveis = Number(latest.recebiveis_cartao);
  const alerts = getAlerts(latest, latestEntries);

  // Sort months ascending for charts
  const monthsAsc = [...months].reverse();

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="mt-1 text-sm text-zinc-500">
          {formatMonthYear(latest.month_year)}
        </p>
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
              <li key={i} className="text-sm text-amber-300/80">
                • {alert}
              </li>
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
        />
        <KPICard
          title="Despesas Totais"
          value={formatCurrency(despesa)}
          icon={<TrendingDown className="h-5 w-5" />}
          variant="negative"
        />
        <KPICard
          title="Lucro Líquido"
          value={formatCurrency(lucro)}
          icon={<TrendingUp className="h-5 w-5" />}
          variant={lucro >= 0 ? "positive" : "negative"}
        />
        <KPICard
          title="Margem Líquida"
          value={formatPercent(margem)}
          icon={<Percent className="h-5 w-5" />}
          variant={margem >= 0.1 ? "positive" : margem >= 0.05 ? "warning" : "negative"}
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
        <RevenueExpenseChart data={monthsAsc} />
        <MarginChart data={monthsAsc} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {stackedData.length > 0 && <StackedExpenseChart data={stackedData} />}
        {categories.length > 0 && <ExpenseCompositionChart data={categories} />}
      </div>

      {latestEntries.length > 0 && <DailyRevenueChart entries={latestEntries} />}
    </div>
  );
}
