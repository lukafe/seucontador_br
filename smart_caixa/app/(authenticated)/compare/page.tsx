"use client";

import { useEffect, useState } from "react";
import KPICard from "@/components/KPICard";
import { formatCurrency, formatPercent, formatMonthYear } from "@/lib/format";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { calculateCMV, calculateCustoPessoal, type Entry, type MonthData } from "@/lib/calculations";
import { ArrowRight, Bot, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";

export default function ComparePage() {
  const [months, setMonths] = useState<MonthData[]>([]);
  const [month1Id, setMonth1Id] = useState("");
  const [month2Id, setMonth2Id] = useState("");
  const [month1, setMonth1] = useState<MonthData | null>(null);
  const [month2, setMonth2] = useState<MonthData | null>(null);
  const [entries1, setEntries1] = useState<Entry[]>([]);
  const [entries2, setEntries2] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [comparing, setComparing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState("");
  const [analyzingAi, setAnalyzingAi] = useState(false);

  useEffect(() => {
    fetch("/api/months")
      .then((r) => r.json())
      .then(setMonths)
      .finally(() => setLoading(false));
  }, []);

  const handleCompare = async () => {
    if (!month1Id || !month2Id) return;
    setComparing(true);
    setAiAnalysis("");

    const [m1Res, m2Res, e1Res, e2Res] = await Promise.all([
      fetch(`/api/months?id=${month1Id}`),
      fetch(`/api/months?id=${month2Id}`),
      fetch(`/api/entries?monthId=${month1Id}`),
      fetch(`/api/entries?monthId=${month2Id}`),
    ]);

    setMonth1(await m1Res.json());
    setMonth2(await m2Res.json());
    setEntries1(await e1Res.json());
    setEntries2(await e2Res.json());
    setComparing(false);
  };

  const handleAiAnalyze = async () => {
    if (!month1 || !month2) return;
    setAnalyzingAi(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `Compare detalhadamente os meses ${month1.month_year} e ${month2.month_year}.

${month1.month_year}: Receita R$ ${Number(month1.receita_total).toLocaleString("pt-BR")}, Despesa R$ ${Number(month1.despesa_total).toLocaleString("pt-BR")}, Lucro R$ ${Number(month1.lucro_liquido).toLocaleString("pt-BR")}, Margem ${(Number(month1.margem_liquida) * 100).toFixed(1)}%

${month2.month_year}: Receita R$ ${Number(month2.receita_total).toLocaleString("pt-BR")}, Despesa R$ ${Number(month2.despesa_total).toLocaleString("pt-BR")}, Lucro R$ ${Number(month2.lucro_liquido).toLocaleString("pt-BR")}, Margem ${(Number(month2.margem_liquida) * 100).toFixed(1)}%

Analise as principais variações e suas possíveis causas.`,
          history: [],
        }),
      });

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let text = "";
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          text += decoder.decode(value, { stream: true });
          setAiAnalysis(text);
        }
      }
    } catch {
      setAiAnalysis("Erro ao conectar com a IA.");
    } finally {
      setAnalyzingAi(false);
    }
  };

  const delta = (v1: number, v2: number) => {
    if (v1 === 0) return 0;
    return ((v2 - v1) / Math.abs(v1)) * 100;
  };

  const deltaColor = (d: number, inverted = false) => {
    const isPositive = inverted ? d < 0 : d > 0;
    return isPositive ? "text-emerald-400" : d === 0 ? "text-zinc-400" : "text-red-400";
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  // Build comparison chart data
  let comparisonData: { name: string; [key: string]: string | number }[] = [];
  if (month1 && month2 && entries1.length && entries2.length) {
    const allCats = new Set<string>();
    entries1.filter((e) => e.tipo === "Despesa").forEach((e) => allCats.add(e.subcategoria));
    entries2.filter((e) => e.tipo === "Despesa").forEach((e) => allCats.add(e.subcategoria));

    comparisonData = Array.from(allCats).map((cat) => {
      const total1 = entries1.filter((e) => e.subcategoria === cat).reduce((s, e) => s + Number(e.valor), 0);
      const total2 = entries2.filter((e) => e.subcategoria === cat).reduce((s, e) => s + Number(e.valor), 0);
      return {
        name: cat,
        [month1.month_year]: total1,
        [month2.month_year]: total2,
      };
    }).sort((a, b) => {
      const maxA = Math.max(Number(Object.values(a).find((v) => typeof v === "number") || 0));
      const maxB = Math.max(Number(Object.values(b).find((v) => typeof v === "number") || 0));
      return maxB - maxA;
    });
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Comparativo</h1>
        <p className="mt-1 text-sm text-zinc-500">Compare dois meses lado a lado</p>
      </div>

      {/* Selectors */}
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-sm font-medium text-zinc-400">Mês 1</label>
          <select
            value={month1Id}
            onChange={(e) => setMonth1Id(e.target.value)}
            className="mt-1 rounded-lg border border-white/[0.06] bg-[#111] px-4 py-2.5 text-sm text-white outline-none"
          >
            <option value="">Selecione</option>
            {months.map((m) => (
              <option key={m.id} value={m.id}>{formatMonthYear(m.month_year)}</option>
            ))}
          </select>
        </div>
        <ArrowRight className="mb-2 h-5 w-5 text-zinc-500" />
        <div>
          <label className="block text-sm font-medium text-zinc-400">Mês 2</label>
          <select
            value={month2Id}
            onChange={(e) => setMonth2Id(e.target.value)}
            className="mt-1 rounded-lg border border-white/[0.06] bg-[#111] px-4 py-2.5 text-sm text-white outline-none"
          >
            <option value="">Selecione</option>
            {months.map((m) => (
              <option key={m.id} value={m.id}>{formatMonthYear(m.month_year)}</option>
            ))}
          </select>
        </div>
        <button
          onClick={handleCompare}
          disabled={!month1Id || !month2Id || comparing}
          className="rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          {comparing ? "Carregando..." : "Comparar"}
        </button>
      </div>

      {/* Comparison results */}
      {month1 && month2 && (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              {
                label: "Receita",
                v1: Number(month1.receita_total),
                v2: Number(month2.receita_total),
              },
              {
                label: "Despesas",
                v1: Number(month1.despesa_total),
                v2: Number(month2.despesa_total),
                inverted: true,
              },
              {
                label: "Lucro",
                v1: Number(month1.lucro_liquido),
                v2: Number(month2.lucro_liquido),
              },
              {
                label: "Margem",
                v1: Number(month1.margem_liquida),
                v2: Number(month2.margem_liquida),
                isPercent: true,
              },
            ].map(({ label, v1, v2, inverted, isPercent }) => {
              const d = isPercent ? (v2 - v1) * 100 : delta(v1, v2);
              return (
                <div key={label} className="rounded-xl border border-white/[0.06] bg-[#111] p-4">
                  <p className="text-xs text-zinc-500">{label}</p>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-sm text-zinc-400">
                      {isPercent ? formatPercent(v1) : formatCurrency(v1)}
                    </span>
                    <span className="text-sm text-zinc-400">→</span>
                    <span className="text-sm font-semibold text-white">
                      {isPercent ? formatPercent(v2) : formatCurrency(v2)}
                    </span>
                  </div>
                  <p className={`mt-1 text-center text-sm font-bold ${deltaColor(d, inverted)}`}>
                    {d > 0 ? "+" : ""}{d.toFixed(1)}{isPercent ? " p.p." : "%"}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Bar chart comparison */}
          {comparisonData.length > 0 && (
            <div className="rounded-xl border border-white/[0.06] bg-[#111] p-5">
              <h3 className="mb-4 text-sm font-medium text-zinc-400">
                Comparativo por Subcategoria
              </h3>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={comparisonData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis
                    type="number"
                    tick={{ fill: "#71717a", fontSize: 11 }}
                    tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fill: "#71717a", fontSize: 11 }}
                    width={150}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#1a1a1a",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "8px",
                      color: "#fff",
                    }}
                    formatter={(value: unknown) =>
                      `R$ ${Number(value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                    }
                  />
                  <Legend />
                  <Bar dataKey={month1.month_year} fill="#3b82f6" radius={[0, 4, 4, 0]} />
                  <Bar dataKey={month2.month_year} fill="#10b981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* AI Analysis button */}
          <div className="rounded-xl border border-white/[0.06] bg-[#111] p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-zinc-400">Análise IA</h3>
              <button
                onClick={handleAiAnalyze}
                disabled={analyzingAi}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
              >
                {analyzingAi ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
                Analisar diferenças com IA
              </button>
            </div>
            {aiAnalysis && (
              <div className="prose prose-invert prose-sm mt-4 max-w-none">
                <ReactMarkdown>{aiAnalysis}</ReactMarkdown>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
