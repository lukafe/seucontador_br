"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import HealthScore from "@/components/HealthScore";
import { calculateHealthScore, type MonthData, type Entry } from "@/lib/calculations";
import { formatMonthYear } from "@/lib/format";

const ScoreEvolutionChart = dynamic(() => import("@/components/Charts/ScoreEvolutionChart"), { ssr: false });

export default function HealthPage() {
  const [months, setMonths] = useState<MonthData[]>([]);
  const [currentEntries, setCurrentEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [scoreHistory, setScoreHistory] = useState<{ name: string; score: number }[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/months");
        const monthsData = await res.json();
        if (!Array.isArray(monthsData)) { setLoading(false); return; }
        const monthsAsc = [...monthsData].reverse();
        setMonths(monthsAsc);

        if (monthsAsc.length > 0) {
          const latest = monthsAsc[monthsAsc.length - 1];
          const entriesRes = await fetch(`/api/entries?monthId=${latest.id}`);
          const entriesData = await entriesRes.json();
          if (Array.isArray(entriesData)) setCurrentEntries(entriesData);

          const history = [];
          for (const m of monthsAsc) {
            const eRes = await fetch(`/api/entries?monthId=${m.id}`);
            const eData = await eRes.json();
            if (!Array.isArray(eData)) continue;
            const idx = monthsAsc.indexOf(m);
            const slice = monthsAsc.slice(0, idx + 1);
            const { score } = calculateHealthScore(slice, eData);
            history.push({ name: formatMonthYear(m.month_year), score });
          }
          setScoreHistory(history);
        }
      } catch (err) {
        console.error("Error loading health:", err);
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
        <p className="text-zinc-400">Carregue pelo menos um mês para ver o relatório de saúde.</p>
      </div>
    );
  }

  const { score, dimensions } = calculateHealthScore(months, currentEntries);

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Relatório de Saúde</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Score geral do negócio baseado em {months.length} {months.length === 1 ? "mês" : "meses"}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-white/[0.06] bg-[#111] p-6">
          <HealthScore score={score} dimensions={dimensions} />
        </div>

        {scoreHistory.length > 1 && (
          <div className="rounded-xl border border-white/[0.06] bg-[#111] p-6">
            <h3 className="mb-4 text-sm font-medium text-zinc-400">Evolução do Score</h3>
            <ScoreEvolutionChart data={scoreHistory} />
          </div>
        )}
      </div>

      <div className="rounded-xl border border-white/[0.06] bg-[#111] p-6">
        <h3 className="mb-4 text-sm font-medium text-zinc-400">Detalhamento por Dimensão</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {dimensions.map((dim) => (
            <div
              key={dim.name}
              className={`rounded-lg border p-4 ${
                dim.status === "good"
                  ? "border-emerald-500/20 bg-emerald-500/5"
                  : dim.status === "warning"
                    ? "border-amber-500/20 bg-amber-500/5"
                    : "border-red-500/20 bg-red-500/5"
              }`}
            >
              <p className="text-sm font-medium text-zinc-300">{dim.name}</p>
              <p className={`mt-1 text-2xl font-bold ${
                dim.status === "good" ? "text-emerald-400" : dim.status === "warning" ? "text-amber-400" : "text-red-400"
              }`}>
                {dim.score}
              </p>
              <p className="mt-1 text-xs text-zinc-500">{dim.benchmark}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
