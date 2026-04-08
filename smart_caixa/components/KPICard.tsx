"use client";

import { ReactNode } from "react";

interface KPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon?: ReactNode;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  variant?: "default" | "positive" | "negative" | "warning";
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
      {(subtitle || trendValue) && (
        <div className="mt-1 flex items-center gap-2">
          {trendValue && (
            <span
              className={`text-xs font-medium ${
                trend === "up"
                  ? "text-emerald-400"
                  : trend === "down"
                    ? "text-red-400"
                    : "text-zinc-400"
              }`}
            >
              {trend === "up" ? "↑" : trend === "down" ? "↓" : "→"}{" "}
              {trendValue}
            </span>
          )}
          {subtitle && <span className="text-xs text-zinc-500">{subtitle}</span>}
        </div>
      )}
    </div>
  );
}
