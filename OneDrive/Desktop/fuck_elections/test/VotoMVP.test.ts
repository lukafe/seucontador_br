// Importa as ferramentas necessárias da biblioteca de testes 'chai' e do 'hardhat'
import { expect } from "chai";
import { ethers } from "hardhat";
import { VotoMVP } from "../typechain-types"; // Importa os tipos gerados pelo Hardhat para autocomplete

// 'describe' é um bloco que agrupa uma série de testes relacionados ao nosso contrato
describe("VotoMVP", function () {
  
  // Declaração de variáveis que usaremos em múltiplos testes
  let contrato: VotoMVP;
  let owner: any;      // Representará a conta do dono/administrador
  let eleitor1: any;   // Representará a conta de um eleitor
  let eleitor2: any;   // Representará a conta de outro eleitor

  // 'beforeEach' é uma função que roda ANTES de cada teste ('it' block) dentro deste 'describe'.
  // É perfeito para configurar um estado limpo para cada teste.
  beforeEach(async function () {
    // Pega as contas de teste que o Hardhat fornece
    [owner, eleitor1, eleitor2] = await ethers.getSigners();

    // Pega a "fábrica" do nosso contrato, que é usada para criar instâncias dele
    const VotoMVPFactory = await ethers.getContractFactory("VotoMVP");
    
    // Faz o deploy de um NOVO contrato para a blockchain de teste local do Hardhat
    contrato = (await VotoMVPFactory.deploy()) as unknown as VotoMVP;
  });

  // =========================================================================
  // SUÍTE DE TESTES: DEPLOY E CONFIGURAÇÃO INICIAL
  // =========================================================================
  describe("Deployment", function () {
    // 'it' define um caso de teste individual. A descrição deve dizer o que ele testa.
    it("Deve definir o criador do contrato como 'owner'", async function () {
      // 'expect' é a função da biblioteca 'chai' que usamos para fazer as asserções.
      // Aqui, esperamos que o valor de `contrato.owner()` SEJA IGUAL a `owner.address`.
      expect(await contrato.owner()).to.equal(owner.address);
    });
  });

  // =========================================================================
  // SUÍTE DE TESTES: GERENCIAMENTO DE CANDIDATOS
  // =========================================================================
  describe("Gerenciamento de Candidatos", function () {
    it("O 'owner' deve conseguir adicionar candidatos com sucesso", async function () {
      // Ação: O 'owner' chama a função 'adicionarCandidato'
      await contrato.connect(owner).adicionarCandidato("Candidato A");
      
      // Verificação: Checamos se o candidato foi adicionado corretamente
      const candidato = await contrato.candidatos(0); // Pega o primeiro candidato do array
      expect(candidato.nome).to.equal("Candidato A");
      expect(candidato.voteCount).to.equal(0);
    });

    it("Um endereço que NÃO é o 'owner' NÃO deve conseguir adicionar candidatos", async function () {
      // Ação e Verificação juntas:
      // Esperamos que a transação, quando o 'eleitor1' tenta adicionar um candidato,
      // seja REVERTIDA (cancelada) com a exata mensagem de erro que definimos no `require`.
      await expect(
        contrato.connect(eleitor1).adicionarCandidato("Candidato Malicioso")
      ).to.be.revertedWith("Erro: Apenas o dono pode executar esta acao.");
    });

    it("Deve falhar ao tentar adicionar um candidato com nome vazio", async function () {
      await expect(
        contrato.connect(owner).adicionarCandidato("")
      ).to.be.revertedWith("Erro: Nome do candidato vazio.");
    });
  });

  // =========================================================================
  // SUÍTE DE TESTES: LÓGICA DE VOTAÇÃO
  // =========================================================================
  describe("Votacao", function () {
    // Preparamos o cenário adicionando um candidato antes do teste de votação
    beforeEach(async function() {
        await contrato.connect(owner).adicionarCandidato("Candidato Valido");
    });

    it("Um eleitor deve conseguir votar com sucesso", async function () {
      // Ação: O 'eleitor1' vota no candidato de ID 0.
      await contrato.connect(eleitor1).votar(0);

      // Verificação: A contagem de votos do candidato deve ser 1.
      const candidato = await contrato.candidatos(0);
      expect(candidato.voteCount).to.equal(1);

      // Verificação extra: O status 'jaVotou' do eleitor1 deve ser 'true'.
      expect(await contrato.jaVotou(eleitor1.address)).to.be.true;
    });

    it("Um eleitor NÃO deve conseguir votar mais de uma vez", async function () {
      await contrato.connect(eleitor1).votar(0); // Primeiro voto

      // Ação e Verificação: Tentativa do segundo voto deve ser revertida.
      await expect(
        contrato.connect(eleitor1).votar(0)
      ).to.be.revertedWith("Erro: Eleitor ja votou.");
    });

    it("Deve falhar ao tentar votar em um candidato que não existe", async function () {
      // Ação e Verificação: Tentar votar no candidato de ID 99 (que não existe) deve falhar.
      await expect(
        contrato.connect(eleitor1).votar(99)
      ).to.be.revertedWith("Erro: Candidato invalido.");
    });
    
    it("Deve emitir um evento 'VotoRegistrado' após um voto bem-sucedido", async function() {
      // Ação e Verificação: Esperamos que ao votar, o contrato emita o evento 'VotoRegistrado'
      // e que os argumentos do evento sejam exatamente o endereço do eleitor e o ID do candidato.
      await expect(contrato.connect(eleitor1).votar(0))
        .to.emit(contrato, "VotoRegistrado")
        .withArgs(eleitor1.address, 0);
    });

    it("totalVotes deve somar os votos de todos os candidatos", async function () {
      await contrato.connect(owner).adicionarCandidato("Outro");
      await contrato.connect(eleitor1).votar(0);
      await contrato.connect(eleitor2).votar(1);
      expect(await (contrato as unknown as any).totalVotes()).to.equal(2);
    });
  });
});