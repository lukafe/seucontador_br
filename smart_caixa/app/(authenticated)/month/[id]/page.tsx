"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import KPICard from "@/components/KPICard";
import DailyRevenueChart from "@/components/Charts/DailyRevenueChart";
import ExpenseCompositionChart from "@/components/Charts/ExpenseCompositionChart";
import { formatCurrency, formatPercent, formatMonthYear, formatDate } from "@/lib/format";
import {
  calculateCMV,
  calculateCustoPessoal,
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
  Banknote,
  Landmark,
  Search,
  Bot,
  Loader2,
} from "lucide-react";
import ReactMarkdown from "react-markdown";

export default function MonthDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [month, setMonth] = useState<MonthData | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [categories, setCategories] = useState<{ subcategoria: string; total: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCat, setFilterCat] = useState("");
  const [aiReport, setAiReport] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [monthRes, entriesRes] = await Promise.all([
          fetch(`/api/months?id=${id}`),
          fetch(`/api/entries?monthId=${id}`),
        ]);
        const monthData = await monthRes.json();
        const entriesData = await entriesRes.json();
        setMonth(monthData);
        setEntries(entriesData);

        // Build categories
        const catMap = new Map<string, number>();
        entriesData
          .filter((e: Entry) => e.tipo === "Despesa")
          .forEach((e: Entry) => {
            catMap.set(e.subcategoria, (catMap.get(e.subcategoria) || 0) + Number(e.valor));
          });
        setCategories(
          Array.from(catMap.entries())
            .map(([subcategoria, total]) => ({ subcategoria, total }))
            .sort((a, b) => b.total - a.total)
        );

        // Load AI report if exists
        // Using a simple fetch - in production we'd have a proper endpoint
      } catch (err) {
        console.error("Error loading month:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading || !month) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  const receita = Number(month.receita_total);
  const despesa = Number(month.despesa_total);
  const lucro = Number(month.lucro_liquido);
  const margem = Number(month.margem_liquida);
  const cmv = calculateCMV(entries, receita);
  const custoPessoal = calculateCustoPessoal(entries, receita);

  // Filter entries
  const filteredEntries = entries.filter((e) => {
    const matchesSearch = !searchQuery || e.descricao.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = !filterCat || e.categoria === filterCat;
    return matchesSearch && matchesCat;
  });

  // Top 10 despesas
  const topDespesas = entries
    .filter((e) => e.tipo === "Despesa")
    .sort((a, b) => Number(b.valor) - Number(a.valor))
    .slice(0, 10);

  // Top 10 fornecedores
  const fornecedorMap = new Map<string, number>();
  entries
    .filter((e) => e.tipo === "Despesa")
    .forEach((e) => {
      fornecedorMap.set(e.descricao, (fornecedorMap.get(e.descricao) || 0) + Number(e.valor));
    });
  const topFornecedores = Array.from(fornecedorMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  // Folha de pagamento
  const folha = entries.filter((e) =>
    ["Salários e Encargos", "Comissões", "Pró-Labore", "Premiação"].includes(e.subcategoria)
  );

  const uniqueCategories = [...new Set(entries.map((e) => e.categoria))];

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">
          {formatMonthYear(month.month_year)}
        </h1>
        <p className="mt-1 text-sm text-zinc-500">Detalhes do mês</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KPICard title="Receita" value={formatCurrency(receita)} icon={<DollarSign className="h-5 w-5" />} variant="positive" />
        <KPICard title="Despesas" value={formatCurrency(despesa)} icon={<TrendingDown className="h-5 w-5" />} variant="negative" />
        <KPICard title="Lucro" value={formatCurrency(lucro)} icon={<TrendingUp className="h-5 w-5" />} variant={lucro >= 0 ? "positive" : "negative"} />
        <KPICard title="Margem" value={formatPercent(margem)} icon={<Percent className="h-5 w-5" />} variant={margem >= 0.1 ? "positive" : "warning"} />
        <KPICard title="CMV" value={formatPercent(cmv)} subtitle="Ideal: 30-40%" />
        <KPICard title="Pessoal" value={formatPercent(custoPessoal)} subtitle="Ideal: 28-35%" />
        <KPICard title="Saldo Final" value={formatCurrency(Number(month.saldo_final))} icon={<Wallet className="h-5 w-5" />} />
        <KPICard title="Recebíveis" value={formatCurrency(Number(month.recebiveis_cartao))} icon={<CreditCard className="h-5 w-5" />} />
      </div>

      {/* Composição de caixa */}
      <div className="rounded-xl border border-white/[0.06] bg-[#111] p-5">
        <h3 className="mb-4 text-sm font-medium text-zinc-400">Composição de Caixa</h3>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="flex items-center gap-3">
            <Banknote className="h-5 w-5 text-emerald-400" />
            <div>
              <p className="text-xs text-zinc-500">Dinheiro</p>
              <p className="font-semibold text-white">{formatCurrency(Number(month.caixa_dinheiro))}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Landmark className="h-5 w-5 text-blue-400" />
            <div>
              <p className="text-xs text-zinc-500">Banco</p>
              <p className="font-semibold text-white">{formatCurrency(Number(month.caixa_banco))}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Wallet className="h-5 w-5 text-purple-400" />
            <div>
              <p className="text-xs text-zinc-500">CDB</p>
              <p className="font-semibold text-white">{formatCurrency(Number(month.caixa_cdb))}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <CreditCard className="h-5 w-5 text-amber-400" />
            <div>
              <p className="text-xs text-zinc-500">Recebíveis Cartão</p>
              <p className="font-semibold text-white">{formatCurrency(Number(month.recebiveis_cartao))}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <DailyRevenueChart entries={entries} />
        <ExpenseCompositionChart data={categories} />
      </div>

      {/* Top 10 despesas & fornecedores */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-white/[0.06] bg-[#111] p-5">
          <h3 className="mb-4 text-sm font-medium text-zinc-400">Top 10 Maiores Despesas</h3>
          <div className="space-y-2">
            {topDespesas.map((e, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg bg-white/[0.02] px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-zinc-300">{e.descricao}</p>
                  <p className="text-xs text-zinc-500">{e.subcategoria}</p>
                </div>
                <p className="ml-3 shrink-0 text-sm font-semibold text-red-400">
                  {formatCurrency(Number(e.valor))}
                </p>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-[#111] p-5">
          <h3 className="mb-4 text-sm font-medium text-zinc-400">Top 10 Fornecedores</h3>
          <div className="space-y-2">
            {topFornecedores.map(([name, total], i) => (
              <div key={i} className="flex items-center justify-between rounded-lg bg-white/[0.02] px-3 py-2">
                <p className="min-w-0 flex-1 truncate text-sm text-zinc-300">{name}</p>
                <p className="ml-3 shrink-0 text-sm font-semibold text-zinc-300">
                  {formatCurrency(total)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Folha de pagamento */}
      {folha.length > 0 && (
        <div className="rounded-xl border border-white/[0.06] bg-[#111] p-5">
          <h3 className="mb-4 text-sm font-medium text-zinc-400">Folha de Pagamento</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="pb-2 text-left text-xs font-medium text-zinc-500">Data</th>
                  <th className="pb-2 text-left text-xs font-medium text-zinc-500">Descrição</th>
                  <th className="pb-2 text-left text-xs font-medium text-zinc-500">Subcategoria</th>
                  <th className="pb-2 text-right text-xs font-medium text-zinc-500">Valor</th>
                </tr>
              </thead>
              <tbody>
                {folha.map((e, i) => (
                  <tr key={i} className="border-b border-white/[0.03]">
                    <td className="py-2 text-zinc-400">{formatDate(e.data)}</td>
                    <td className="py-2 text-zinc-300">{e.descricao}</td>
                    <td className="py-2 text-zinc-400">{e.subcategoria}</td>
                    <td className="py-2 text-right font-medium text-zinc-300">{formatCurrency(Number(e.valor))}</td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={3} className="pt-3 text-sm font-semibold text-zinc-300">Total</td>
                  <td className="pt-3 text-right font-bold text-white">
                    {formatCurrency(folha.reduce((sum, e) => sum + Number(e.valor), 0))}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tabela de lançamentos */}
      <div className="rounded-xl border border-white/[0.06] bg-[#111] p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-sm font-medium text-zinc-400">
            Lançamentos ({filteredEntries.length})
          </h3>
          <div className="flex gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
              <input
                type="text"
                placeholder="Buscar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="rounded-lg border border-white/[0.06] bg-[#0a0a0a] py-2 pl-9 pr-3 text-sm text-white placeholder-zinc-500 outline-none focus:border-emerald-500/50"
              />
            </div>
            <select
              value={filterCat}
              onChange={(e) => setFilterCat(e.target.value)}
              className="rounded-lg border border-white/[0.06] bg-[#0a0a0a] px-3 py-2 text-sm text-white outline-none focus:border-emerald-500/50"
            >
              <option value="">Todas categorias</option>
              {uniqueCategories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="max-h-[500px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-[#111]">
              <tr className="border-b border-white/[0.06]">
                <th className="pb-2 text-left text-xs font-medium text-zinc-500">Data</th>
                <th className="pb-2 text-left text-xs font-medium text-zinc-500">Tipo</th>
                <th className="pb-2 text-left text-xs font-medium text-zinc-500">Categoria</th>
                <th className="pb-2 text-left text-xs font-medium text-zinc-500">Subcategoria</th>
                <th className="pb-2 text-left text-xs font-medium text-zinc-500">Descrição</th>
                <th className="pb-2 text-right text-xs font-medium text-zinc-500">Valor</th>
              </tr>
            </thead>
            <tbody>
              {filteredEntries.slice(0, 200).map((e, i) => (
                <tr key={i} className="border-b border-white/[0.03]">
                  <td className="py-2 text-zinc-400">{formatDate(e.data)}</td>
                  <td className="py-2">
                    <span className={`text-xs font-medium ${e.tipo === "Receita" ? "text-emerald-400" : "text-red-400"}`}>
                      {e.tipo}
                    </span>
                  </td>
                  <td className="py-2 text-zinc-400">{e.categoria}</td>
                  <td className="py-2 text-zinc-400">{e.subcategoria}</td>
                  <td className="py-2 text-zinc-300">{e.descricao}</td>
                  <td className="py-2 text-right font-medium text-zinc-300">
                    {formatCurrency(Number(e.valor))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredEntries.length > 200 && (
            <p className="mt-2 text-center text-xs text-zinc-500">
              Mostrando 200 de {filteredEntries.length} lançamentos
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
