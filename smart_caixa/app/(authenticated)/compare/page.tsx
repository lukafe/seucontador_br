"use client";

import { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { formatCurrency, formatPercent, formatMonthYear } from "@/lib/format";
import { calculateCMV, calculateCustoPessoal, type Entry, type MonthData } from "@/lib/calculations";
import { Bot, Loader2, ArrowRight, AlertTriangle } from "lucide-react";
import Markdown from "@/components/Markdown";

const ComparisonBarChart = dynamic(() => import("@/components/Charts/ComparisonBarChart"), { ssr: false });

interface CompareMonth {
  data: MonthData;
  entries: Entry[];
}

export default function ComparePage() {
  const [months, setMonths] = useState<MonthData[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>(["", ""]);
  const [compared, setCompared] = useState<CompareMonth[]>([]);
  const [loading, setLoading] = useState(true);
  const [comparing, setComparing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState("");
  const [analyzingAi, setAnalyzingAi] = useState(false);

  useEffect(() => {
    fetch("/api/months")
      .then((r) => r.json())
      .then((data: MonthData[]) => { if (Array.isArray(data)) setMonths(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const addMonth = () => {
    if (selectedIds.length < 3) setSelectedIds([...selectedIds, ""]);
  };

  const removeMonth = (idx: number) => {
    if (selectedIds.length > 2) setSelectedIds(selectedIds.filter((_, i) => i !== idx));
  };

  const setId = (idx: number, val: string) => {
    const copy = [...selectedIds];
    copy[idx] = val;
    setSelectedIds(copy);
  };

  const handleCompare = async () => {
    const validIds = selectedIds.filter(Boolean);
    if (validIds.length < 2) return;
    setComparing(true);
    setAiAnalysis("");

    const results: CompareMonth[] = [];
    for (const id of validIds) {
      const [mRes, eRes] = await Promise.all([
        fetch(`/api/months?id=${id}`),
        fetch(`/api/entries?monthId=${id}`),
      ]);
      const mData = await mRes.json();
      const eData = await eRes.json();
      results.push({ data: mData, entries: Array.isArray(eData) ? eData : [] });
    }
    setCompared(results);
    setComparing(false);
  };

  const handleAiAnalyze = async () => {
    if (compared.length < 2) return;
    setAnalyzingAi(true);
    try {
      const context = compared.map(c =>
        `${c.data.month_year}: Receita R$ ${Number(c.data.receita_total).toLocaleString("pt-BR")}, Despesa R$ ${Number(c.data.despesa_total).toLocaleString("pt-BR")}, Lucro R$ ${Number(c.data.lucro_liquido).toLocaleString("pt-BR")}, Margem ${(Number(c.data.margem_liquida) * 100).toFixed(1)}%`
      ).join("\n\n");

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `Compare detalhadamente estes ${compared.length} meses:\n\n${context}\n\nDestaque as maiores variações e suas possíveis causas. Dê recomendações práticas.`,
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
    } catch { setAiAnalysis("Erro ao conectar com a IA."); }
    finally { setAnalyzingAi(false); }
  };

  const delta = (v1: number, v2: number) => v1 === 0 ? 0 : ((v2 - v1) / Math.abs(v1)) * 100;

  // Metrics to compare
  const metrics = useMemo(() => {
    if (compared.length < 2) return [];
    return [
      { label: "Receita", key: "receita_total", format: formatCurrency },
      { label: "Despesas", key: "despesa_total", format: formatCurrency, inverted: true },
      { label: "Lucro", key: "lucro_liquido", format: formatCurrency },
      { label: "Margem", key: "margem_liquida", format: formatPercent, isPercent: true },
      { label: "CMV %", key: "cmv", format: formatPercent, isPercent: true, inverted: true },
      { label: "Pessoal %", key: "custo_pessoal", format: formatPercent, isPercent: true, inverted: true },
    ].map(m => {
      const values = compared.map(c => {
        if (m.key === "cmv") return calculateCMV(c.entries, Number(c.data.receita_total));
        if (m.key === "custo_pessoal") return calculateCustoPessoal(c.entries, Number(c.data.receita_total));
        return Number((c.data as unknown as Record<string, unknown>)[m.key] || 0);
      });
      return { ...m, values };
    });
  }, [compared]);

  // Top 5 biggest variations by subcategory
  const topVariations = useMemo(() => {
    if (compared.length < 2) return [];
    const first = compared[0];
    const last = compared[compared.length - 1];
    const catMap1 = new Map<string, number>();
    const catMap2 = new Map<string, number>();
    first.entries.filter(e => e.tipo === "Despesa").forEach(e => catMap1.set(e.subcategoria, (catMap1.get(e.subcategoria) || 0) + Number(e.valor)));
    last.entries.filter(e => e.tipo === "Despesa").forEach(e => catMap2.set(e.subcategoria, (catMap2.get(e.subcategoria) || 0) + Number(e.valor)));

    const allCats = new Set([...catMap1.keys(), ...catMap2.keys()]);
    return Array.from(allCats).map(cat => {
      const v1 = catMap1.get(cat) || 0;
      const v2 = catMap2.get(cat) || 0;
      const d = v1 > 0 ? ((v2 - v1) / v1) * 100 : v2 > 0 ? 100 : 0;
      return { cat, v1, v2, delta: d, absDelta: Math.abs(v2 - v1) };
    }).sort((a, b) => b.absDelta - a.absDelta).slice(0, 7);
  }, [compared]);

  // Chart comparison data
  const comparisonData = useMemo(() => {
    if (compared.length < 2) return [];
    const allCats = new Set<string>();
    compared.forEach(c => c.entries.filter(e => e.tipo === "Despesa").forEach(e => allCats.add(e.subcategoria)));

    return Array.from(allCats).map(cat => {
      const point: { name: string; [key: string]: string | number } = { name: cat };
      compared.forEach(c => {
        const total = c.entries.filter(e => e.subcategoria === cat).reduce((s, e) => s + Number(e.valor), 0);
        point[c.data.month_year] = total;
      });
      return point;
    }).sort((a, b) => {
      const maxA = Math.max(...compared.map(c => Number(a[c.data.month_year] || 0)));
      const maxB = Math.max(...compared.map(c => Number(b[c.data.month_year] || 0)));
      return maxB - maxA;
    });
  }, [compared]);

  if (loading) {
    return <div className="flex h-96 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" /></div>;
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Comparativo</h1>
        <p className="mt-1 text-sm text-zinc-500">Compare até 3 meses lado a lado</p>
      </div>

      {/* Selectors */}
      <div className="flex flex-wrap items-end gap-3">
        {selectedIds.map((id, idx) => (
          <div key={idx} className="flex items-end gap-1">
            {idx > 0 && <ArrowRight className="mb-2 h-4 w-4 text-zinc-500" />}
            <div>
              <label className="block text-xs font-medium text-zinc-400">Mês {idx + 1}</label>
              <select value={id} onChange={(e) => setId(idx, e.target.value)} className="mt-1 rounded-lg border border-white/[0.06] bg-[#111] px-3 py-2 text-sm text-white outline-none">
                <option value="">Selecione</option>
                {months.map((m) => <option key={m.id} value={m.id}>{formatMonthYear(m.month_year)}</option>)}
              </select>
            </div>
            {selectedIds.length > 2 && (
              <button onClick={() => removeMonth(idx)} className="mb-1 text-xs text-zinc-500 hover:text-red-400">✕</button>
            )}
          </div>
        ))}
        {selectedIds.length < 3 && (
          <button onClick={addMonth} className="mb-1 rounded-lg border border-dashed border-white/[0.1] px-3 py-2 text-xs text-zinc-500 hover:border-white/[0.2] hover:text-white">+ Mês</button>
        )}
        <button onClick={handleCompare} disabled={selectedIds.filter(Boolean).length < 2 || comparing} className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50">
          {comparing ? "Carregando..." : "Comparar"}
        </button>
      </div>

      {/* Results */}
      {compared.length >= 2 && (
        <>
          {/* Metrics table */}
          <div className="rounded-xl border border-white/[0.06] bg-[#111] overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="px-5 py-3 text-left text-xs font-medium text-zinc-500">Indicador</th>
                  {compared.map((c, i) => (
                    <th key={i} className="px-5 py-3 text-right text-xs font-medium text-zinc-400">{formatMonthYear(c.data.month_year)}</th>
                  ))}
                  <th className="px-5 py-3 text-right text-xs font-medium text-zinc-500">Δ</th>
                </tr>
              </thead>
              <tbody>
                {metrics.map((m) => {
                  const d = m.isPercent
                    ? (m.values[m.values.length - 1] - m.values[0]) * 100
                    : delta(m.values[0], m.values[m.values.length - 1]);
                  const isGood = m.inverted ? d < 0 : d > 0;
                  return (
                    <tr key={m.key} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                      <td className="px-5 py-2.5 font-medium text-zinc-300">{m.label}</td>
                      {m.values.map((v, i) => (
                        <td key={i} className="px-5 py-2.5 text-right font-mono text-zinc-300">{m.format(v)}</td>
                      ))}
                      <td className={`px-5 py-2.5 text-right font-mono font-semibold ${isGood ? "text-emerald-400" : d === 0 ? "text-zinc-400" : "text-red-400"}`}>
                        {d > 0 ? "+" : ""}{d.toFixed(1)}{m.isPercent ? " p.p." : "%"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Top variations */}
          {topVariations.length > 0 && (
            <div className="rounded-xl border border-white/[0.06] bg-[#111] p-5">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                <h3 className="text-sm font-medium text-zinc-400">Maiores Variações por Subcategoria</h3>
              </div>
              <div className="space-y-2">
                {topVariations.map((v) => (
                  <div key={v.cat} className="flex items-center justify-between rounded-lg bg-white/[0.02] px-4 py-2.5">
                    <span className="text-sm text-zinc-300">{v.cat}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-zinc-500">{formatCurrency(v.v1)} → {formatCurrency(v.v2)}</span>
                      <span className={`text-sm font-bold ${v.delta > 10 ? "text-red-400" : v.delta < -10 ? "text-emerald-400" : "text-zinc-400"}`}>
                        {v.delta > 0 ? "+" : ""}{v.delta.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Chart */}
          {comparisonData.length > 0 && compared.length === 2 && (
            <ComparisonBarChart data={comparisonData} month1Key={compared[0].data.month_year} month2Key={compared[1].data.month_year} />
          )}

          {/* AI Analysis */}
          <div className="rounded-xl border border-white/[0.06] bg-[#111] p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-zinc-400">Análise IA</h3>
              <button onClick={handleAiAnalyze} disabled={analyzingAi} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50">
                {analyzingAi ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
                Analisar com IA
              </button>
            </div>
            {aiAnalysis && <div className="mt-4"><Markdown>{aiAnalysis}</Markdown></div>}
          </div>
        </>
      )}
    </div>
  );
}
