-- Meses carregados
CREATE TABLE IF NOT EXISTS months (
  id SERIAL PRIMARY KEY,
  month_year VARCHAR(7) NOT NULL UNIQUE,
  uploaded_at TIMESTAMP DEFAULT NOW(),
  file_name VARCHAR(255),
  receita_total DECIMAL(12,2),
  despesa_total DECIMAL(12,2),
  lucro_liquido DECIMAL(12,2),
  margem_liquida DECIMAL(5,4),
  saldo_anterior DECIMAL(12,2),
  saldo_final DECIMAL(12,2),
  caixa_dinheiro DECIMAL(12,2),
  caixa_banco DECIMAL(12,2),
  caixa_cdb DECIMAL(12,2),
  recebiveis_cartao DECIMAL(12,2)
);

-- Lançamentos individuais
CREATE TABLE IF NOT EXISTS entries (
  id SERIAL PRIMARY KEY,
  month_id INTEGER REFERENCES months(id) ON DELETE CASCADE,
  data DATE,
  tipo VARCHAR(10),
  categoria VARCHAR(100),
  subcategoria VARCHAR(100),
  descricao VARCHAR(255),
  valor DECIMAL(12,2)
);

-- Resumo por subcategoria
CREATE TABLE IF NOT EXISTS category_summary (
  id SERIAL PRIMARY KEY,
  month_id INTEGER REFERENCES months(id) ON DELETE CASCADE,
  subcategoria VARCHAR(100),
  total DECIMAL(12,2),
  percentual_receita DECIMAL(5,4)
);

-- Histórico de análises da IA
CREATE TABLE IF NOT EXISTS ai_analyses (
  id SERIAL PRIMARY KEY,
  month_id INTEGER,
  analysis_type VARCHAR(50),
  prompt_summary TEXT,
  response TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_entries_month_id ON entries(month_id);
CREATE INDEX IF NOT EXISTS idx_entries_subcategoria ON entries(subcategoria);
CREATE INDEX IF NOT EXISTS idx_category_summary_month_id ON category_summary(month_id);
CREATE INDEX IF NOT EXISTS idx_ai_analyses_month_id ON ai_analyses(month_id);
