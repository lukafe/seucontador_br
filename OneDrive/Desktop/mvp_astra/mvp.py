import os
from langchain_community.document_loaders import TextLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
from langchain_huggingface import HuggingFaceEmbeddings

# --- PARTE 1: PROCESSAR DADOS E CRIAR O VECTOR STORE ---

# Carrega os documentos da pasta
documents = []
for file in ["A_company.txt", "B_company.txt", "C_company.txt"]:
    if os.path.exists(file):
        # Debug: try reading file directly
        try:
            with open(file, 'r', encoding='utf-8') as f:
                content = f.read()
                print(f"File {file}: {len(content)} chars")
                print(f"Content: {content}")
        except Exception as e:
            print(f"Error reading {file}: {e}")

        loader = TextLoader(file, encoding='utf-8')
        documents.extend(loader.load())

print(f"Loaded {len(documents)} documents")

# Debug: print document content
for i, doc in enumerate(documents):
    print(f"Document {i}: {len(doc.page_content)} chars")
    print(f"Content preview: {doc.page_content[:100]}")

# Divide os textos em pedaços menores (chunks)
text_splitter = RecursiveCharacterTextSplitter(chunk_size=100, chunk_overlap=10)
chunks = text_splitter.split_documents(documents)

print(f"Created {len(chunks)} chunks")

# Cria o modelo de embedding (que transforma texto em vetores)
embedding_model = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

# Armazena os chunks e seus vetores em um banco de dados local (ChromaDB)
vector_store = Chroma.from_documents(
    chunks,
    embedding_model,
    persist_directory="./chroma_db_mvp"
)

print("Base de Conhecimento criada com sucesso!")


# --- PARTE 2: PERFIL DO INVESTIDOR E CONSULTA (RETRIEVAL) ---

# 1. "Vibecodar" (Hardcode) o perfil do investidor
# Mude esses valores para testar diferentes perfis depois!
perfil_investidor = {
    "risco": "Moderado",
    "objetivo": "Crescimento a longo prazo com segurança",
    "preferencias_esg": "ESG é um fator importante"
}

# 2. Criar uma consulta em linguagem natural a partir do perfil
query = f"""
Análise de ações para um investidor com perfil de risco {perfil_investidor['risco']},
com foco em {perfil_investidor['objetivo']}.
Além disso, {perfil_investidor['preferencias_esg']}.
"""

print("\n--- Consulta Gerada ---")
print(query)

# 3. Configurar o "recuperador" (retriever) para buscar no vector_store
# O retriever vai buscar os 'k' chunks mais relevantes. Vamos pegar os 3 melhores.
retriever = vector_store.as_retriever(search_kwargs={"k": 3})

# 4. Executar a busca
documentos_relevantes = retriever.invoke(query)

print("\n--- Documentos Relevantes Encontrados ---")
# Imprime o conteúdo dos documentos encontrados para verificarmos
for i, doc in enumerate(documentos_relevantes):
    print(f"Documento {i+1}:\n{doc.page_content}\n")

# --- PARTE 3: GERAÇÃO DA RESPOSTA FINAL ---

# 5. Combinar os documentos relevantes em um contexto
contexto = "\n\n".join([doc.page_content for doc in documentos_relevantes])

# 6. Criar o prompt final para geração da resposta
prompt_final = f"""
Baseado no perfil do investidor:
- Risco: {perfil_investidor['risco']}
- Objetivo: {perfil_investidor['objetivo']}
- Preferências ESG: {perfil_investidor['preferencias_esg']}

E considerando as seguintes informações das empresas:
{contexto}

Por favor, forneça uma análise de investimento recomendada, incluindo:
1. Empresas mais adequadas ao perfil
2. Justificativa baseada no risco e objetivos
3. Considerações sobre os aspectos ESG
4. Recomendações específicas de ação
"""

print("\n--- Prompt para Geração da Resposta ---")
print(prompt_final)

# Nota: Para completar este sistema, você precisaria integrar com um LLM aqui
# Por exemplo, usando OpenAI, HuggingFace, ou outro modelo de linguagem
# para gerar a resposta final baseada no contexto e prompt acima.

print("\n=== ANÁLISE COMPLETA ===")
print("Sistema RAG executado com sucesso!")
print(f"- {len(documents)} documentos carregados")
print(f"- {len(chunks)} chunks criados")
print(f"- {len(documentos_relevantes)} documentos relevantes encontrados")
print("- Resposta final pronta para geração (integração com LLM necessária)")