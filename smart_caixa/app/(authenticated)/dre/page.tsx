"use client";

import { useEffect, useState, useMemo } from "react";
import PeriodFilter, { type PeriodType, filterMonthsByPeriod } from "@/components/PeriodFilter";
import { formatCurrency, formatMonthYear } from "@/lib/format";
import type { MonthData, Entry } from "@/lib/calculations";

interface DRELine {
  label: string;
  key: string;
  indent?: boolean;
  bold?: boolean;
  separator?: boolean;
  getValue: (entries: Entry[], receita: number) => number;
}

const DRE_STRUCTURE: DRELine[] = [
  { label: "(+) Receita Bruta", key: "receita_bruta", bold: true, getValue: (e) => e.filter(x => x.tipo === "Receita").reduce((s, x) => s + Number(x.valor), 0) },
  { label: "(-) Devoluções de Venda", key: "devolucoes", indent: true, getValue: (e) => e.filter(x => x.subcategoria === "Devolução de venda").reduce((s, x) => s + Number(x.valor), 0) },
  { label: "(=) Receita Líquida", key: "receita_liquida", bold: true, separator: true, getValue: (e) => {
    const rec = e.filter(x => x.tipo === "Receita").reduce((s, x) => s + Number(x.valor), 0);
    const dev = e.filter(x => x.subcategoria === "Devolução de venda").reduce((s, x) => s + Number(x.valor), 0);
    return rec - dev;
  }},
  { label: "(-) Matéria-Prima", key: "materia_prima", indent: true, getValue: (e) => e.filter(x => x.subcategoria === "Matéria-Prima").reduce((s, x) => s + Number(x.valor), 0) },
  { label: "(-) Embalagens", key: "embalagens", indent: true, getValue: (e) => e.filter(x => x.subcategoria === "Embalagens").reduce((s, x) => s + Number(x.valor), 0) },
  { label: "(-) Mão de Obra Direta", key: "mao_obra", indent: true, getValue: (e) => e.filter(x => x.subcategoria === "Mão de Obra Direta").reduce((s, x) => s + Number(x.valor), 0) },
  { label: "(=) Lucro Bruto", key: "lucro_bruto", bold: true, separator: true, getValue: (e) => {
    const rec = e.filter(x => x.tipo === "Receita").reduce((s, x) => s + Number(x.valor), 0);
    const dev = e.filter(x => x.subcategoria === "Devolução de venda").reduce((s, x) => s + Number(x.valor), 0);
    const cmv = e.filter(x => ["Matéria-Prima", "Embalagens", "Mão de Obra Direta"].includes(x.subcategoria)).reduce((s, x) => s + Number(x.valor), 0);
    return rec - dev - cmv;
  }},
  { label: "(-) Salários e Encargos", key: "salarios", indent: true, getValue: (e) => e.filter(x => x.subcategoria === "Salários e Encargos").reduce((s, x) => s + Number(x.valor), 0) },
  { label: "(-) Comissões", key: "comissoes", indent: true, getValue: (e) => e.filter(x => x.subcategoria === "Comissões").reduce((s, x) => s + Number(x.valor), 0) },
  { label: "(-) Pró-Labore", key: "prolabore", indent: true, getValue: (e) => e.filter(x => x.subcategoria === "Pró-Labore").reduce((s, x) => s + Number(x.valor), 0) },
  { label: "(-) Aluguel", key: "aluguel", indent: true, getValue: (e) => e.filter(x => x.subcategoria === "Aluguel").reduce((s, x) => s + Number(x.valor), 0) },
  { label: "(-) Contas de Consumo", key: "contas", indent: true, getValue: (e) => e.filter(x => x.subcategoria === "Contas de Consumo").reduce((s, x) => s + Number(x.valor), 0) },
  { label: "(-) Marketing e Publicidade", key: "marketing", indent: true, getValue: (e) => e.filter(x => x.subcategoria === "Marketing e Publicidade").reduce((s, x) => s + Number(x.valor), 0) },
  { label: "(-) Frete s/ Venda", key: "frete", indent: true, getValue: (e) => e.filter(x => x.subcategoria === "Frete s/venda").reduce((s, x) => s + Number(x.valor), 0) },
  { label: "(-) Despesas Bancárias", key: "bancarias", indent: true, getValue: (e) => e.filter(x => x.subcategoria === "Despesas Bancárias").reduce((s, x) => s + Number(x.valor), 0) },
  { label: "(-) Manutenção", key: "manutencao", indent: true, getValue: (e) => e.filter(x => x.subcategoria === "Manutenção").reduce((s, x) => s + Number(x.valor), 0) },
  { label: "(-) Material de Escritório", key: "escritorio", indent: true, getValue: (e) => e.filter(x => x.subcategoria === "Material de Escritório").reduce((s, x) => s + Number(x.valor), 0) },
  { label: "(-) Imobilizado", key: "imobilizado", indent: true, getValue: (e) => e.filter(x => x.subcategoria === "Imobilizado").reduce((s, x) => s + Number(x.valor), 0) },
  { label: "(-) Premiação", key: "premiacao", indent: true, getValue: (e) => e.filter(x => x.subcategoria === "Premiação").reduce((s, x) => s + Number(x.valor), 0) },
  { label: "(=) EBITDA", key: "ebitda", bold: true, separator: true, getValue: (e) => {
    const rec = e.filter(x => x.tipo === "Receita").reduce((s, x) => s + Number(x.valor), 0);
    const despOp = e.filter(x => x.tipo === "Despesa" && x.subcategoria !== "Imposto" && x.subcategoria !== "Simples Nacional").reduce((s, x) => s + Number(x.valor), 0);
    return rec - despOp;
  }},
  { label: "(-) Impostos", key: "impostos", indent: true, getValue: (e) => e.filter(x => ["Imposto", "Simples Nacional", "Despesas com Impostos"].includes(x.subcategoria) || x.categoria === "Despesas com Impostos").reduce((s, x) => s + Number(x.valor), 0) },
  { label: "(=) Lucro Líquido", key: "lucro_liquido", bold: true, separator: true, getValue: (e) => {
    const rec = e.filter(x => x.tipo === "Receita").reduce((s, x) => s + Number(x.valor), 0);
    const desp = e.filter(x => x.tipo === "Despesa").reduce((s, x) => s + Number(x.valor), 0);
    return rec - desp;
  }},
  { label: "Margem Líquida %", key: "margem", bold: true, getValue: (e, receita) => {
    if (receita === 0) return 0;
    const rec = e.filter(x => x.tipo === "Receita").reduce((s, x) => s + Number(x.valor), 0);
    const desp = e.filter(x => x.tipo === "Despesa").reduce((s, x) => s + Number(x.valor), 0);
    return ((rec - desp) / rec) * 100;
  }},
];

export default function DREPage() {
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

  // Current period entries
  const currentEntries = useMemo(() => filteredMonths.flatMap(m => entriesByMonth[m.id] || []), [filteredMonths, entriesByMonth]);
  const currentReceita = currentEntries.filter(e => e.tipo === "Receita").reduce((s, e) => s + Number(e.valor), 0);

  // Previous period
  const prevEntries = useMemo(() => {
    const len = filteredMonths.length;
    const startIdx = monthsAsc.indexOf(filteredMonths[0]);
    if (startIdx < 0) return [];
    const prev = monthsAsc.slice(Math.max(0, startIdx - len), startIdx);
    return prev.flatMap(m => entriesByMonth[m.id] || []);
  }, [filteredMonths, monthsAsc, entriesByMonth]);
  const prevReceita = prevEntries.filter(e => e.tipo === "Receita").reduce((s, e) => s + Number(e.valor), 0);

  // YTD (acumulado do ano)
  const currentYear = filteredMonths.length > 0 ? filteredMonths[filteredMonths.length - 1].month_year.split("-")[0] : "";
  const ytdMonths = monthsAsc.filter(m => m.month_year.startsWith(currentYear));
  const ytdEntries = useMemo(() => ytdMonths.flatMap(m => entriesByMonth[m.id] || []), [ytdMonths, entriesByMonth]);
  const ytdReceita = ytdEntries.filter(e => e.tipo === "Receita").reduce((s, e) => s + Number(e.valor), 0);

  if (loading) {
    return <div className="flex h-96 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" /></div>;
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">DRE</h1>
          <p className="mt-1 text-sm text-zinc-500">Demonstrativo de Resultado do Exercício</p>
        </div>
        <PeriodFilter
          selected={period}
          onChange={setPeriod}
          selectedMonth={selectedMonth}
          onMonthChange={setSelectedMonth}
          availableMonths={[...allMonthKeys].reverse()}
        />
      </div>

      <div className="rounded-xl border border-white/[0.06] bg-[#111] overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="px-5 py-3 text-left text-xs font-medium text-zinc-500 w-[40%]">Conta</th>
              <th className="px-5 py-3 text-right text-xs font-medium text-zinc-500">Período Atual</th>
              <th className="px-5 py-3 text-right text-xs font-medium text-zinc-500">% Receita</th>
              <th className="px-5 py-3 text-right text-xs font-medium text-zinc-500">Período Anterior</th>
              <th className="px-5 py-3 text-right text-xs font-medium text-zinc-500">Δ %</th>
              <th className="px-5 py-3 text-right text-xs font-medium text-zinc-500">Acum. {currentYear}</th>
            </tr>
          </thead>
          <tbody>
            {DRE_STRUCTURE.map((line) => {
              const current = line.getValue(currentEntries, currentReceita);
              const prev = prevEntries.length > 0 ? line.getValue(prevEntries, prevReceita) : null;
              const ytd = ytdEntries.length > 0 ? line.getValue(ytdEntries, ytdReceita) : null;
              const pctReceita = currentReceita > 0 ? (current / currentReceita) * 100 : 0;
              const delta = prev && prev !== 0 ? ((current - prev) / Math.abs(prev)) * 100 : null;
              const isMargin = line.key === "margem";
              const isResult = line.key === "lucro_liquido" || line.key === "ebitda" || line.key === "lucro_bruto" || line.key === "receita_liquida";

              return (
                <tr
                  key={line.key}
                  className={`${line.separator ? "border-t border-white/[0.06]" : ""} ${line.bold ? "bg-white/[0.02]" : ""} hover:bg-white/[0.03]`}
                >
                  <td className={`px-5 py-2.5 ${line.indent ? "pl-10" : ""} ${line.bold ? "font-semibold text-zinc-200" : "text-zinc-400"}`}>
                    {line.label}
                  </td>
                  <td className={`px-5 py-2.5 text-right font-mono ${line.bold ? "font-semibold" : ""} ${
                    isResult ? (current >= 0 ? "text-emerald-400" : "text-red-400") : "text-zinc-300"
                  }`}>
                    {isMargin ? `${current.toFixed(1)}%` : formatCurrency(current)}
                  </td>
                  <td className="px-5 py-2.5 text-right font-mono text-xs text-zinc-500">
                    {isMargin ? "" : `${pctReceita.toFixed(1)}%`}
                  </td>
                  <td className="px-5 py-2.5 text-right font-mono text-zinc-500">
                    {prev != null ? (isMargin ? `${prev.toFixed(1)}%` : formatCurrency(prev)) : "—"}
                  </td>
                  <td className={`px-5 py-2.5 text-right font-mono text-xs ${
                    delta == null ? "text-zinc-600" : delta > 0 ? "text-emerald-400" : delta < 0 ? "text-red-400" : "text-zinc-400"
                  }`}>
                    {delta != null ? `${delta > 0 ? "+" : ""}${delta.toFixed(1)}%` : "—"}
                  </td>
                  <td className="px-5 py-2.5 text-right font-mono text-zinc-400">
                    {ytd != null ? (isMargin ? `${ytd.toFixed(1)}%` : formatCurrency(ytd)) : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
