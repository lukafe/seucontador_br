"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      if (!res.ok) {
        setError("Email não autorizado. Entre em contato com o administrador.");
      } else {
        router.push("/dashboard");
      }
    } catch {
      setError("Erro ao conectar com o servidor.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
      <div className="w-full max-w-sm">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-wide text-white">
            FORMEDICA
          </h1>
          <p className="mt-1 text-sm text-zinc-500">Smart Caixa</p>
        </div>

        <form onSubmit={handleLogin} className="mt-8">
          <div className="rounded-xl border border-white/[0.06] bg-[#111] p-6">
            <label
              htmlFor="email"
              className="block text-sm font-medium text-zinc-400"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="mt-2 w-full rounded-lg border border-white/[0.06] bg-[#0a0a0a] px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none focus:border-emerald-500/50"
              required
            />

            {error && (
              <div className="mt-3 flex items-center gap-2 text-sm text-red-400">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !email}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Verificando...
                </>
              ) : (
                "Entrar"
              )}
            </button>
          </div>

          <p className="mt-4 text-center text-xs text-zinc-600">
            Acesso restrito a emails autorizados
          </p>
        </form>
      </div>
    </div>
  );
}
