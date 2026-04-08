"use client";

import type { HealthDimension } from "@/lib/calculations";

interface HealthScoreProps {
  score: number;
  dimensions: HealthDimension[];
}

const statusColors = {
  good: "bg-emerald-500",
  warning: "bg-amber-500",
  danger: "bg-red-500",
};

const statusBg = {
  good: "bg-emerald-500/20",
  warning: "bg-amber-500/20",
  danger: "bg-red-500/20",
};

export default function HealthScore({ score, dimensions }: HealthScoreProps) {
  const scoreColor =
    score >= 70 ? "text-emerald-400" : score >= 50 ? "text-amber-400" : "text-red-400";
  const ringColor =
    score >= 70 ? "stroke-emerald-500" : score >= 50 ? "stroke-amber-500" : "stroke-red-500";

  return (
    <div>
      {/* Score circle */}
      <div className="flex flex-col items-center gap-4">
        <div className="relative h-48 w-48">
          <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="8"
            />
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              className={ringColor}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${score * 2.64} 264`}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-4xl font-bold ${scoreColor}`}>{score}</span>
            <span className="text-sm text-zinc-400">de 100</span>
          </div>
        </div>
        <p className={`text-lg font-semibold ${scoreColor}`}>
          {score >= 80
            ? "Excelente"
            : score >= 70
              ? "Bom"
              : score >= 50
                ? "Atenção"
                : "Crítico"}
        </p>
      </div>

      {/* Dimensions */}
      <div className="mt-8 space-y-4">
        {dimensions.map((dim) => (
          <div key={dim.name}>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-sm font-medium text-zinc-300">
                {dim.name}
              </span>
              <span className="text-sm text-zinc-400">{dim.score}/100</span>
            </div>
            <div className={`h-2.5 w-full rounded-full ${statusBg[dim.status]}`}>
              <div
                className={`h-full rounded-full transition-all ${statusColors[dim.status]}`}
                style={{ width: `${dim.score}%` }}
              />
            </div>
            <p className="mt-0.5 text-xs text-zinc-500">{dim.benchmark}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
