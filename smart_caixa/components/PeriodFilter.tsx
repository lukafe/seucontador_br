"use client";

import { formatMonthYear } from "@/lib/format";

export type PeriodType = "1m" | "3m" | "6m" | "1y" | "all";

interface PeriodFilterProps {
  selected: PeriodType;
  onChange: (period: PeriodType) => void;
  selectedMonth?: string;
  onMonthChange?: (monthYear: string) => void;
  availableMonths?: string[];
}

const periods: { key: PeriodType; label: string }[] = [
  { key: "1m", label: "Mês" },
  { key: "3m", label: "3 Meses" },
  { key: "6m", label: "6 Meses" },
  { key: "1y", label: "1 Ano" },
  { key: "all", label: "Tudo" },
];

export default function PeriodFilter({
  selected,
  onChange,
  selectedMonth,
  onMonthChange,
  availableMonths = [],
}: PeriodFilterProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex rounded-lg border border-white/[0.06] bg-[#111] p-1">
        {periods.map((p) => (
          <button
            key={p.key}
            onClick={() => onChange(p.key)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              selected === p.key
                ? "bg-emerald-500/20 text-emerald-400"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {selected === "1m" && availableMonths.length > 0 && onMonthChange && (
        <select
          value={selectedMonth || ""}
          onChange={(e) => onMonthChange(e.target.value)}
          className="rounded-lg border border-white/[0.06] bg-[#111] px-3 py-1.5 text-xs text-white outline-none focus:border-emerald-500/50"
        >
          {availableMonths.map((m) => (
            <option key={m} value={m}>
              {formatMonthYear(m)}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

export function filterMonthsByPeriod(
  allMonths: string[],
  period: PeriodType,
  selectedMonth?: string
): string[] {
  if (period === "all" || allMonths.length === 0) return allMonths;

  const sorted = [...allMonths].sort();
  const latest = sorted[sorted.length - 1];

  if (period === "1m") {
    const target = selectedMonth || latest;
    return sorted.filter((m) => m === target);
  }

  const monthsBack = period === "3m" ? 3 : period === "6m" ? 6 : 12;
  const [y, m] = latest.split("-").map(Number);
  const cutoffDate = new Date(y, m - 1 - monthsBack, 1);
  const cutoff = `${cutoffDate.getFullYear()}-${String(cutoffDate.getMonth() + 1).padStart(2, "0")}`;

  return sorted.filter((month) => month > cutoff);
}
