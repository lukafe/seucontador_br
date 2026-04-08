export interface MonthData {
  id: number;
  month_year: string;
  receita_total: number;
  despesa_total: number;
  lucro_liquido: number;
  margem_liquida: number;
  saldo_anterior: number;
  saldo_final: number;
  caixa_dinheiro: number;
  caixa_banco: number;
  caixa_cdb: number;
  recebiveis_cartao: number;
}

export interface Entry {
  id: number;
  month_id: number;
  data: string;
  tipo: string;
  categoria: string;
  subcategoria: string;
  descricao: string;
  valor: number;
}

export interface CategorySummary {
  subcategoria: string;
  total: number;
  percentual_receita: number;
}

export interface HealthDimension {
  name: string;
  value: number;
  score: number;
  benchmark: string;
  status: "good" | "warning" | "danger";
}

export function calculateCMV(entries: Entry[], receita: number): number {
  const cmvCategories = ["Matéria-Prima", "Embalagens"];
  const cmvTotal = entries
    .filter((e) => cmvCategories.includes(e.subcategoria))
    .reduce((sum, e) => sum + Number(e.valor), 0);
  return receita > 0 ? cmvTotal / receita : 0;
}

export function calculateCustoPessoal(entries: Entry[], receita: number): number {
  const pessoalCategories = ["Salários e Encargos", "Comissões", "Pró-Labore"];
  const pessoalTotal = entries
    .filter((e) => pessoalCategories.includes(e.subcategoria))
    .reduce((sum, e) => sum + Number(e.valor), 0);
  return receita > 0 ? pessoalTotal / receita : 0;
}

export function calculateCustosFixos(entries: Entry[], receita: number): number {
  const fixoCategories = [
    "Aluguel", "Contas de Consumo", "Salários e Encargos",
    "Pró-Labore", "Manutenção",
  ];
  const fixoTotal = entries
    .filter((e) => fixoCategories.includes(e.subcategoria))
    .reduce((sum, e) => sum + Number(e.valor), 0);
  return receita > 0 ? fixoTotal / receita : 0;
}

export function calculateDespesasBancarias(entries: Entry[], receita: number): number {
  const total = entries
    .filter((e) => e.subcategoria === "Despesas Bancárias")
    .reduce((sum, e) => sum + Number(e.valor), 0);
  return receita > 0 ? total / receita : 0;
}

export function calculateFrete(entries: Entry[], receita: number): number {
  const total = entries
    .filter((e) => e.subcategoria === "Frete s/venda")
    .reduce((sum, e) => sum + Number(e.valor), 0);
  return receita > 0 ? total / receita : 0;
}

export function getAlerts(month: MonthData, entries: Entry[]): string[] {
  const alerts: string[] = [];
  const cmv = calculateCMV(entries, month.receita_total);
  const custoPessoal = calculateCustoPessoal(entries, month.receita_total);

  if (month.margem_liquida < 0.05) {
    alerts.push("Margem líquida abaixo de 5%");
  }
  if (cmv > 0.4) {
    alerts.push("CMV acima de 40%");
  }
  if (custoPessoal > 0.4) {
    alerts.push("Custo com pessoal acima de 40%");
  }
  if (month.lucro_liquido < 0) {
    alerts.push("Mês fechou negativo");
  }
  return alerts;
}

export function calculateHealthScore(
  months: MonthData[],
  currentEntries: Entry[]
): { score: number; dimensions: HealthDimension[] } {
  if (months.length === 0) return { score: 0, dimensions: [] };

  const current = months[months.length - 1];
  const receita = current.receita_total;
  const cmv = calculateCMV(currentEntries, receita);
  const custoPessoal = calculateCustoPessoal(currentEntries, receita);
  const margem = current.margem_liquida;
  const custosFixos = calculateCustosFixos(currentEntries, receita);

  const dimensions: HealthDimension[] = [];

  // Faturamento
  const fatScore = receita >= 700000 ? 95 : receita >= 600000 ? 80 : receita >= 400000 ? 60 : 40;
  dimensions.push({
    name: "Faturamento",
    value: receita,
    score: fatScore,
    benchmark: "> R$ 600k = 80+",
    status: fatScore >= 75 ? "good" : fatScore >= 50 ? "warning" : "danger",
  });

  // CMV
  const cmvScore = cmv <= 0.30 ? 95 : cmv <= 0.35 ? 85 : cmv <= 0.40 ? 70 : cmv <= 0.45 ? 50 : 30;
  dimensions.push({
    name: "CMV",
    value: cmv,
    score: cmvScore,
    benchmark: "30-40% = 75",
    status: cmvScore >= 70 ? "good" : cmvScore >= 50 ? "warning" : "danger",
  });

  // Margem operacional
  const margemOp = receita > 0 ? (receita - current.despesa_total) / receita : 0;
  const margemOpScore = margemOp >= 0.15 ? 90 : margemOp >= 0.10 ? 75 : margemOp >= 0.05 ? 55 : 30;
  dimensions.push({
    name: "Margem Operacional",
    value: margemOp,
    score: margemOpScore,
    benchmark: "> 15% = 90",
    status: margemOpScore >= 70 ? "good" : margemOpScore >= 50 ? "warning" : "danger",
  });

  // Margem líquida
  const margemScore = margem >= 0.15 ? 95 : margem >= 0.10 ? 80 : margem >= 0.05 ? 60 : 30;
  dimensions.push({
    name: "Margem Líquida",
    value: margem,
    score: margemScore,
    benchmark: "> 10% = 80",
    status: margemScore >= 70 ? "good" : margemScore >= 50 ? "warning" : "danger",
  });

  // Custo com pessoal
  const pessoalScore = custoPessoal <= 0.28 ? 95 : custoPessoal <= 0.32 ? 80 : custoPessoal <= 0.35 ? 65 : custoPessoal <= 0.40 ? 45 : 25;
  dimensions.push({
    name: "Custo com Pessoal",
    value: custoPessoal,
    score: pessoalScore,
    benchmark: "28-35% = 65-80",
    status: pessoalScore >= 65 ? "good" : pessoalScore >= 45 ? "warning" : "danger",
  });

  // Reserva de caixa
  const reserva = current.caixa_cdb + current.caixa_banco;
  const mesesReserva = current.despesa_total > 0 ? reserva / current.despesa_total : 0;
  const reservaScore = mesesReserva >= 3 ? 95 : mesesReserva >= 2 ? 80 : mesesReserva >= 1 ? 60 : 30;
  dimensions.push({
    name: "Reserva de Caixa",
    value: mesesReserva,
    score: reservaScore,
    benchmark: "> 3 meses de despesa",
    status: reservaScore >= 70 ? "good" : reservaScore >= 50 ? "warning" : "danger",
  });

  // Liquidez
  const liquidez = current.despesa_total > 0
    ? (current.caixa_dinheiro + current.caixa_banco + current.recebiveis_cartao) / current.despesa_total
    : 0;
  const liquidezScore = liquidez >= 1.5 ? 90 : liquidez >= 1 ? 70 : liquidez >= 0.5 ? 45 : 20;
  dimensions.push({
    name: "Liquidez",
    value: liquidez,
    score: liquidezScore,
    benchmark: "Caixa disponível vs despesas",
    status: liquidezScore >= 70 ? "good" : liquidezScore >= 45 ? "warning" : "danger",
  });

  // Sustentabilidade (tendência)
  let sustScore = 60;
  if (months.length >= 3) {
    const last3 = months.slice(-3);
    const trend = last3[2].margem_liquida - last3[0].margem_liquida;
    sustScore = trend > 0.02 ? 90 : trend > 0 ? 75 : trend > -0.02 ? 55 : 30;
  }
  dimensions.push({
    name: "Sustentabilidade",
    value: sustScore / 100,
    score: sustScore,
    benchmark: "Tendência últimos meses",
    status: sustScore >= 70 ? "good" : sustScore >= 50 ? "warning" : "danger",
  });

  const totalScore = Math.round(
    dimensions.reduce((sum, d) => sum + d.score, 0) / dimensions.length
  );

  return { score: totalScore, dimensions };
}
