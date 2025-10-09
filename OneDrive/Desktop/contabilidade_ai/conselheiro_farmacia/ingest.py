# Importações necessárias
import os
from langchain_community.document_loaders import PyPDFLoader, TextLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_community.vectorstores import Chroma
from dotenv import load_dotenv

# Carrega as variáveis de ambiente do arquivo .env
load_dotenv()

# Configuração de constantes
KNOWLEDGE_BASE_DIR = "knowledge_base"
CHROMA_DB_DIR = "chroma_db"

def main():
    """
    Função principal que orquestra o processo de ingestão de documentos.
    """
    print("Iniciando o processo de ingestão de documentos...")

    # 1. Carregar os documentos da pasta
    documents = []
    for filename in os.listdir(KNOWLEDGE_BASE_DIR):
        file_path = os.path.join(KNOWLEDGE_BASE_DIR, filename)
        try:
            if filename.endswith('.pdf'):
                loader = PyPDFLoader(file_path)
                documents.extend(loader.load())
                print(f"Carregado {filename} (PDF).")
            elif filename.endswith('.txt'):
                loader = TextLoader(file_path, encoding='utf-8')
                documents.extend(loader.load())
                print(f"Carregado {filename} (TXT).")
        except Exception as e:
            print(f"Erro ao carregar o arquivo {filename}: {e}")

    if not documents:
        print("Nenhum documento encontrado para processar. Encerrando.")
        return

    # 2. Dividir os documentos em chunks
    print("Dividindo documentos em chunks...")
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1500,  # Tamanho de cada pedaço de texto
        chunk_overlap=200 # Sobreposição para manter o contexto entre os pedaços
    )
    chunks = text_splitter.split_documents(documents)
    print(f"Total de {len(chunks)} chunks criados.")

    # 3. Inicializar o modelo de embeddings
    # Este modelo transforma texto em vetores numéricos
    print("Inicializando modelo de embeddings...")
    embeddings_model = GoogleGenerativeAIEmbeddings(model="models/embedding-001")

    # 4. Criar e persistir o banco de dados vetorial
    # O ChromaDB irá criar os embeddings para cada chunk e salvar no diretório especificado
    print(f"Criando e salvando o banco de dados vetorial em '{CHROMA_DB_DIR}'...")
    vector_store = Chroma.from_documents(
        documents=chunks,
        embedding=embeddings_model,
        persist_directory=CHROMA_DB_DIR
    )

    print("\nProcesso de ingestão concluído com sucesso!")

if __name__ == "__main__":
    # Garante que o script só rode quando executado diretamente
    main()

