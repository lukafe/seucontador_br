"use client";

import { useState } from "react";
import Dropzone from "@/components/Upload/Dropzone";
import { formatCurrency } from "@/lib/format";
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [monthYear, setMonthYear] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    entries?: number;
    receita?: number;
    despesa?: number;
    lucro?: number;
    monthId?: number;
  } | null>(null);
  const [error, setError] = useState("");
  const [aiReport, setAiReport] = useState("");
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  const currentYear = new Date().getFullYear();
  const monthOptions = [];
  for (let y = currentYear; y >= currentYear - 3; y--) {
    for (let m = 12; m >= 1; m--) {
      const val = `${y}-${String(m).padStart(2, "0")}`;
      const months = [
        "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
        "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
      ];
      monthOptions.push({ value: val, label: `${months[m - 1]} ${y}` });
    }
  }

  const handleUpload = async () => {
    if (!file || !monthYear) return;

    setIsUploading(true);
    setError("");
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("monthYear", monthYear);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erro no upload");
      }

      setResult({
        success: true,
        entries: data.summary.entries,
        receita: data.summary.receita,
        despesa: data.summary.despesa,
        lucro: data.summary.lucro,
        monthId: data.monthId,
      });

      // Auto-generate AI report
      if (data.monthId) {
        setIsGeneratingReport(true);
        try {
          const aiRes = await fetch("/api/ai/auto-report", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ monthId: data.monthId }),
          });
          const aiData = await aiRes.json();
          if (aiData.response) {
            setAiReport(aiData.response);
          }
        } catch {
          // AI report is optional
        } finally {
          setIsGeneratingReport(false);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro no upload");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="animate-fade-in mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Upload</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Carregue o arquivo Excel do caixa mensal
        </p>
      </div>

      <div className="rounded-xl border border-white/[0.06] bg-[#111] p-6">
        {/* Month selector */}
        <label className="block text-sm font-medium text-zinc-400">
          Mês de referência
        </label>
        <select
          value={monthYear}
          onChange={(e) => setMonthYear(e.target.value)}
          className="mt-2 w-full rounded-lg border border-white/[0.06] bg-[#0a0a0a] px-4 py-3 text-sm text-white outline-none focus:border-emerald-500/50"
        >
          <option value="">Selecione o mês</option>
          {monthOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Dropzone */}
        <div className="mt-4">
          <Dropzone onFileSelected={setFile} isLoading={isUploading} />
        </div>

        {/* Upload button */}
        <button
          onClick={handleUpload}
          disabled={!file || !monthYear || isUploading}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
        >
          {isUploading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Processando...
            </>
          ) : (
            "Confirmar e salvar"
          )}
        </button>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-400">
            <AlertCircle className="h-5 w-5 shrink-0" />
            {error}
          </div>
        )}
      </div>

      {/* Result */}
      {result?.success && (
        <div className="animate-fade-in rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-6">
          <div className="flex items-center gap-2 text-emerald-400">
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-semibold">Upload concluído!</span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-zinc-500">Lançamentos</p>
              <p className="text-lg font-bold text-white">{result.entries}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Receita</p>
              <p className="text-lg font-bold text-emerald-400">
                {formatCurrency(result.receita || 0)}
              </p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Despesas</p>
              <p className="text-lg font-bold text-red-400">
                {formatCurrency(result.despesa || 0)}
              </p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Lucro</p>
              <p
                className={`text-lg font-bold ${(result.lucro || 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}
              >
                {formatCurrency(result.lucro || 0)}
              </p>
            </div>
          </div>

          <div className="mt-4 flex gap-3">
            <a
              href={`/month/${result.monthId}`}
              className="rounded-lg bg-white/[0.06] px-4 py-2 text-sm text-zinc-300 hover:bg-white/[0.1]"
            >
              Ver detalhes
            </a>
            <a
              href="/dashboard"
              className="rounded-lg bg-white/[0.06] px-4 py-2 text-sm text-zinc-300 hover:bg-white/[0.1]"
            >
              Ir ao Dashboard
            </a>
          </div>
        </div>
      )}

      {/* AI Report */}
      {(isGeneratingReport || aiReport) && (
        <div className="animate-fade-in rounded-xl border border-white/[0.06] bg-[#111] p-6">
          <h3 className="text-sm font-medium text-zinc-400">
            Relatório automático da IA
          </h3>
          {isGeneratingReport ? (
            <div className="mt-4 flex items-center gap-2 text-zinc-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Gerando análise...
            </div>
          ) : (
            <div className="prose prose-invert prose-sm mt-4 max-w-none">
              <pre className="whitespace-pre-wrap text-sm text-zinc-300">
                {aiReport}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
