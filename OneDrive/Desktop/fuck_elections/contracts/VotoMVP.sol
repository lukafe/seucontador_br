// SPDX-License-Identifier: MIT
// Define a licença do código. É uma boa prática para projetos de código aberto.
pragma solidity ^0.8.24;

/**
 * @title VotoMVP
 * @dev Este é um smart contract para um sistema de votação simples (MVP).
 * Funcionalidades:
 * - Um dono (administrador) pode adicionar candidatos.
 * - Qualquer pessoa pode votar uma única vez.
 * - Todos podem ver os resultados.
 */
contract VotoMVP {

    // =========================================================================
    // VARIÁVEIS DE ESTADO
    // São as variáveis que guardam os dados permanentemente na blockchain.
    // =========================================================================

    // 'public' cria automaticamente uma função "getter" para que possamos ler este valor.
    address public owner;

    // Uma "struct" é como um molde para agrupar diferentes variáveis.
    // Aqui, ela representa um candidato com seu nome e contagem de votos.
    struct Candidato {
        string nome;        // Nome do candidato
        uint256 voteCount;  // Contagem de votos (usamos uint256 por padrão para números)
    }

    // Um array público de Candidatos.
    // Ele armazenará todos os candidatos da eleição.
    Candidato[] public candidatos;

    // Um "mapping" é como um dicionário ou hash map.
    // Ele vai associar um endereço de carteira (address) a um valor booleano (true/false).
    // Usaremos para verificar se um endereço já votou. É extremamente eficiente.
    mapping(address => bool) public jaVotou;


    // =========================================================================
    // EVENTOS
    // =========================================================================

    event CandidatoAdicionado(uint256 indexed candidatoId, string nome);
    event VotoRegistrado(address indexed eleitor, uint256 indexed candidatoId);


    // =========================================================================
    // MODIFICADOR
    // =========================================================================

    modifier apenasOwner() {
        require(msg.sender == owner, "Erro: Apenas o dono pode executar esta acao.");
        _;
    }


    // =========================================================================
    // FUNÇÕES
    // =========================================================================

    /**
     * @dev O construtor é uma função especial executada apenas UMA VEZ,
     * quando o contrato é criado (implantado na blockchain).
     */
    constructor() {
        owner = msg.sender;
    }

    /**
     * @dev Adiciona um novo candidato à eleição.
     * @param _nome O nome do candidato a ser adicionado.
     * Note o modificador 'apenasOwner' aqui.
     */
    function adicionarCandidato(string memory _nome) public apenasOwner {
        require(bytes(_nome).length > 0, "Erro: Nome do candidato vazio.");
        uint256 candidatoId = candidatos.length;
        candidatos.push(Candidato(_nome, 0));
        emit CandidatoAdicionado(candidatoId, _nome);
    }

    /**
     * @dev Registra um voto para um candidato específico.
     * @param _candidatoId O ID (índice no array) do candidato.
     */
    function votar(uint256 _candidatoId) public {
        // Verificação 1: O candidato deve existir.
        require(_candidatoId < candidatos.length, "Erro: Candidato invalido.");
        // Verificação 2: O eleitor não pode ter votado antes.
        require(!jaVotou[msg.sender], "Erro: Eleitor ja votou.");

        // Atualiza estado
        jaVotou[msg.sender] = true;
        candidatos[_candidatoId].voteCount++;

        emit VotoRegistrado(msg.sender, _candidatoId);
    }

    /**
     * @dev Uma função 'view' apenas lê dados da blockchain, não modifica nada.
     * @return O número total de candidatos.
     */
    function getTotalCandidatos() public view returns (uint256) {
        return candidatos.length;
    }

    /**
     * @dev Soma os votos de todos os candidatos (para métricas/relatórios).
     */
    function totalVotes() public view returns (uint256) {
        uint256 total;
        for (uint256 i = 0; i < candidatos.length; i++) {
            total += candidatos[i].voteCount;
        }
        return total;
    }
}