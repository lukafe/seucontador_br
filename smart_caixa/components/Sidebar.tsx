"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Upload,
  Calendar,
  GitCompare,
  Activity,
  MessageSquare,
  LogOut,
  Table2,
  Truck,
  Users,
  Target,
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "DRE", href: "/dre", icon: Table2 },
  { name: "Fornecedores", href: "/suppliers", icon: Truck },
  { name: "Pessoal", href: "/payroll", icon: Users },
  { name: "Estratégico", href: "/goals", icon: Target },
  { name: "Comparativo", href: "/compare", icon: GitCompare },
  { name: "Saúde", href: "/health", icon: Activity },
  { name: "Histórico", href: "/month/list", icon: Calendar },
  { name: "Upload", href: "/upload", icon: Upload },
  { name: "Assistente IA", href: "/assistant", icon: MessageSquare },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-white/[0.06] bg-[#0a0a0a]">
      <div className="flex h-20 items-center gap-3 border-b border-white/[0.06] px-6">
        <div>
          <h1 className="text-lg font-bold tracking-wide text-white">
            FORMEDICA
          </h1>
          <p className="text-xs text-zinc-500">Smart Caixa</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-emerald-500/10 text-emerald-400"
                  : "text-zinc-400 hover:bg-white/[0.04] hover:text-white"
              }`}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/[0.06] p-3">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-400 transition-colors hover:bg-white/[0.04] hover:text-white"
        >
          <LogOut className="h-5 w-5" />
          Sair
        </button>
      </div>
    </aside>
  );
}
