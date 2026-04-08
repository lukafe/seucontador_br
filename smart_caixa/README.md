# Formedica - Smart Caixa

Plataforma de inteligencia financeira para farmacia de manipulacao. Upload de planilhas Excel mensais, dashboard com KPIs, graficos, comparativos e assistente IA (Gemini).

## Stack

- Next.js 14+ (App Router, TypeScript)
- Tailwind CSS
- Recharts
- NextAuth.js (Credentials)
- Neon Postgres (Serverless)
- Google Gemini API
- Vercel

## Setup

1. Clone o repositorio:
```bash
git clone https://github.com/lukafe/smart_caixa.git
cd smart_caixa
npm install
```

2. Crie o arquivo `.env.local`:
```bash
cp .env.local.example .env.local
```

3. Preencha as variaveis:
```env
DATABASE_URL=postgres://...
ALLOWED_EMAILS=email1@gmail.com,email2@gmail.com
NEXTAUTH_SECRET=sua-chave-secreta
NEXTAUTH_URL=http://localhost:3000
GEMINI_API_KEY=sua-chave-gemini
```

4. Configure o banco de dados:
   - Crie um projeto no Neon (neon.tech) ou Vercel Postgres
   - Copie a connection string para `DATABASE_URL`
   - Execute o schema: `scripts/seed.sql`

5. Rode localmente:
```bash
npm run dev
```

## Deploy na Vercel

1. Crie um projeto na Vercel e conecte ao repositorio GitHub
2. Adicione Storage > Postgres > copie DATABASE_URL
3. Configure env vars: `DATABASE_URL`, `ALLOWED_EMAILS`, `NEXTAUTH_SECRET`, `GEMINI_API_KEY`
4. Execute `scripts/seed.sql` no banco para criar as tabelas
5. Deploy automatico via push para main
