"use client";

import { ReactNode } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface KPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon?: ReactNode;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  variant?: "default" | "positive" | "negative" | "warning";
  previousValue?: string;
}

const variantColors = {
  default: "text-white",
  positive: "text-emerald-400",
  negative: "text-red-400",
  warning: "text-amber-400",
};

export default function KPICard({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendValue,
  variant = "default",
  previousValue,
}: KPICardProps) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#111] p-5 transition-all hover:border-white/[0.1]">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-zinc-400">{title}</p>
        {icon && <span className="text-zinc-500">{icon}</span>}
      </div>
      <p className={`mt-2 text-2xl font-bold ${variantColors[variant]}`}>
        {value}
      </p>
      <div className="mt-1.5 flex items-center gap-2">
        {trendValue && (
          <span
            className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-semibold ${
              trend === "up"
                ? "bg-emerald-500/10 text-emerald-400"
                : trend === "down"
                  ? "bg-red-500/10 text-red-400"
                  : "bg-zinc-500/10 text-zinc-400"
            }`}
          >
            {trend === "up" ? (
              <TrendingUp className="h-3 w-3" />
            ) : trend === "down" ? (
              <TrendingDown className="h-3 w-3" />
            ) : (
              <Minus className="h-3 w-3" />
            )}
            {trendValue}
          </span>
        )}
        {previousValue && (
          <span className="text-xs text-zinc-600">
            ant: {previousValue}
          </span>
        )}
        {subtitle && !previousValue && (
          <span className="text-xs text-zinc-500">{subtitle}</span>
        )}
      </div>
    </div>
  );
}

// Utility to compute trend
export function computeTrend(
  current: number,
  previous: number | null | undefined
): { trend: "up" | "down" | "neutral"; trendValue: string } | null {
  if (previous == null || previous === 0) return null;
  const delta = ((current - previous) / Math.abs(previous)) * 100;
  if (Math.abs(delta) < 0.5) return { trend: "neutral", trendValue: "0%" };
  return {
    trend: delta > 0 ? "up" : "down",
    trendValue: `${delta > 0 ? "+" : ""}${delta.toFixed(1)}%`,
  };
}
