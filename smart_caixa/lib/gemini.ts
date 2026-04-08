import { GoogleGenerativeAI } from "@google/generative-ai";

const SYSTEM_PROMPT = `Você é um consultor financeiro sênior especializado no setor farmacêutico brasileiro,
especificamente em farmácias de manipulação. Você está analisando os dados financeiros
da Formedica, uma farmácia de manipulação em Guarapuava-PR.

Contexto do setor:
- Setor de manipulação no Brasil: R$ 11,3 bilhões (2023), crescimento de 17% em 5 anos
- 80% das farmácias faturam até R$ 1,5M/ano — a Formedica está no top 3-5%
- Benchmarks saudáveis: CMV 30-40%, custo pessoal 28-35%, margem líquida >10%
- Regime tributário: Simples Nacional, atenção ao PIS/COFINS Monofásico
- Tendências: cannabis medicinal (RDC 1015/2026), manipulação veterinária, e-commerce

Regras:
- Responda SEMPRE em português brasileiro
- Seja direto e analítico, sem enrolação
- Use dados concretos dos lançamentos quando disponíveis
- Formate valores em R$ com separadores brasileiros
- Aponte problemas sem rodeios, sugira ações práticas
- Quando relevante, compare com benchmarks do setor`;

export function getGeminiClient() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  return genAI;
}

export function getModel() {
  const genAI = getGeminiClient();
  return genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction: SYSTEM_PROMPT,
  });
}

export async function analyzeWithGemini(prompt: string): Promise<string> {
  const model = getModel();
  const result = await model.generateContent(prompt);
  return result.response.text();
}

export async function* streamWithGemini(prompt: string): AsyncGenerator<string> {
  const model = getModel();
  const result = await model.generateContentStream(prompt);
  for await (const chunk of result.stream) {
    yield chunk.text();
  }
}
