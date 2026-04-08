export function formatCurrency(value: number | null | undefined): string {
  if (value == null) return "R$ 0,00";
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function formatPercent(value: number | null | undefined): string {
  if (value == null) return "0,0%";
  return (value * 100).toFixed(1).replace(".", ",") + "%";
}

export function formatPercentRaw(value: number | null | undefined): string {
  if (value == null) return "0,0%";
  return value.toFixed(1).replace(".", ",") + "%";
}

export function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("pt-BR");
}

export function formatMonthYear(monthYear: string): string {
  const [year, month] = monthYear.split("-");
  const months = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ];
  return `${months[parseInt(month) - 1]} ${year}`;
}
