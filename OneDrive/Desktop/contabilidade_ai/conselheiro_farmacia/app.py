# Importações necessárias
import streamlit as st
from dotenv import load_dotenv
from langchain_google_genai import GoogleGenerativeAIEmbeddings, ChatGoogleGenerativeAI
from langchain_community.vectorstores import Chroma
from langchain.prompts import PromptTemplate
from langchain.chains import LLMChain
from langchain.schema.runnable import RunnablePassthrough
from langchain.schema.output_parser import StrOutputParser

# Carrega as variáveis de ambiente do arquivo .env
# É crucial fazer isso antes de inicializar qualquer serviço que use a API key
load_dotenv()

# Constantes
CHROMA_DB_DIR = "chroma_db"

# --- Lógica do RAG (Backend) ---

@st.cache_resource # Cacheia o recurso para não recarregar a cada interação
def get_rag_chain():
    """
    Função para inicializar e retornar a cadeia RAG completa.
    O cache do Streamlit evita recriar esses objetos pesados a cada vez.
    """
    # 1. Conectar ao banco de dados vetorial existente
    embeddings_model = GoogleGenerativeAIEmbeddings(model="models/embedding-001")
    vector_store = Chroma(
        persist_directory=CHROMA_DB_DIR,
        embedding_function=embeddings_model
    )

    # 2. Criar um Retriever
    # O retriever é o componente que busca informações no banco vetorial
    retriever = vector_store.as_retriever(search_kwargs={'k': 5}) # Buscar os 5 chunks mais relevantes

    # 3. Definir o modelo de linguagem (LLM)
    llm = ChatGoogleGenerativeAI(model="gemini-pro", temperature=0.3, convert_system_message_to_human=True)

    # 4. Criar o Template do Prompt (a alma do nosso conselheiro)
    prompt_template_text = """
    Você é um consultor de negócios sênior, especialista em tributação e regulamentação para farmácias de manipulação no Brasil. Sua linguagem é profissional, clara e objetiva, mas também encorajadora.

    Com base estritamente no CONTEXTO TÉCNICO abaixo, que contém trechos da legislação e artigos de especialistas, analise o caso do empreendedor e forneça um aconselhamento detalhado.

    CONTEXTO TÉCNICO:
    ---
    {context}
    ---

    DADOS DO NEGÓCIO PARA ANÁLISE:
    - Faturamento Anual: {question}
    - Vende cosméticos/outros produtos: {vende_cosmeticos}
    - Localização: {localizacao}
    - Número de funcionários: {num_funcionarios}

    ESTRUTURA DA RESPOSTA:
    Sua resposta DEVE ser estruturada nos seguintes tópicos, usando formatação Markdown:

    ### 1. Análise de Enquadramento Tributário
    - Compare as opções (Simples Nacional, Lucro Presumido, Lucro Real) para o cenário apresentado.
    - Destaque a complexidade da segregação de receitas (serviço vs. comércio) no Simples Nacional.
    - Forneça uma recomendação clara e justificada.

    ### 2. Oportunidades de Otimização e Recuperação de Impostos
    - Com base no contexto, identifique oportunidades claras (ex: créditos de PIS/COFINS sobre insumos, regime monofásico).
    - Explique de forma simples como cada oportunidade funciona.

    ### 3. Recomendações sobre Estrutura Jurídica e Próximos Passos
    - Sugira a estrutura societária mais adequada (SLU, LTDA).
    - Dê 2 ou 3 passos práticos que o empreendedor deve tomar a seguir.

    Se o contexto não fornecer informações suficientes para responder a uma parte da pergunta, indique "Com base nas informações disponíveis, não é possível detalhar este ponto."
    """
    prompt = PromptTemplate(
        template=prompt_template_text,
        input_variables=["context", "question", "vende_cosmeticos", "localizacao", "num_funcionarios"]
    )

    # 5. Montar a cadeia RAG (RAG Chain)
    # Usando a sintaxe LCEL (LangChain Expression Language)
    rag_chain = (
        {
            "context": retriever,
            "question": RunnablePassthrough(),
            "vende_cosmeticos": RunnablePassthrough(),
            "localizacao": RunnablePassthrough(),
            "num_funcionarios": RunnablePassthrough()
        }
        | prompt
        | llm
        | StrOutputParser()
    )

    return rag_chain

# --- Interface do Usuário (Frontend) ---

def main_ui():
    """
    Função que desenha a interface web com Streamlit.
    """
    st.set_page_config(page_title="Conselheiro AI para Farmácias", page_icon="💊")
    st.title('🤖 Conselheiro AI para Farmácias de Manipulação')
    st.caption('Uma análise tributária e de negócios baseada em IA.')

    with st.form("analise_form"):
        st.header("Informações do Negócio")
        faturamento_anual = st.number_input('Qual o faturamento bruto anual estimado?', min_value=0, step=10000, format="R$ %d")
        vende_cosmeticos = st.selectbox('Além das fórmulas, vende cosméticos/outros produtos?', ('Não, apenas manipulação', 'Sim, vendo outros produtos'))
        localizacao = st.text_input('Onde sua empresa está localizada (Cidade / Estado)?', placeholder="Ex: Campinas / SP")
        num_funcionarios = st.number_input('Quantos funcionários registrados (CLT)?', min_value=0, step=1)
        submitted = st.form_submit_button("Gerar Aconselhamento Detalhado")

    if submitted:
        if not faturamento_anual or not localizacao:
            st.error("Por favor, preencha o faturamento e a localização para continuar.")
        else:
            with st.spinner('Aguarde... Estou consultando a legislação e os especialistas para gerar sua análise...'):
                try:
                    # Monta o dicionário de dados do usuário
                    user_data = {
                        "question": f"R$ {faturamento_anual:,.2f}",
                        "vende_cosmeticos": vende_cosmeticos.split(',')[0], # 'Não' ou 'Sim'
                        "localizacao": localizacao,
                        "num_funcionarios": str(num_funcionarios)
                    }

                    # Obtém a cadeia RAG
                    rag_chain = get_rag_chain()

                    # Invoca a cadeia com os dados do usuário
                    response = rag_chain.invoke(user_data)

                    st.success("Análise Concluída!")
                    st.markdown(response)

                except Exception as e:
                    st.error(f"Ocorreu um erro ao processar sua solicitação: {e}")
                    st.error("Verifique se sua chave de API está configurada corretamente no arquivo .env e se o banco de dados vetorial foi criado executando 'python ingest.py'.")

    st.markdown("---")
    st.warning("**Aviso Legal:** Esta é uma análise gerada por IA e serve como um ponto de partida. Sempre consulte um contador profissional para tomar decisões financeiras e fiscais.")


if __name__ == "__main__":
    main_ui()

