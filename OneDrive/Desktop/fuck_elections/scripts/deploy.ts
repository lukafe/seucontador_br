// Importamos o pacote 'ethers' que vem junto com o Hardhat.
// Ele nos dá as ferramentas para interagir com a blockchain.
import { ethers } from "hardhat";

// A função 'main' é o ponto de entrada do nosso script.
async function main() {
  // 1. Pega a "fábrica" do contrato. Pense nela como um molde que sabe como criar
  //    instâncias do nosso contrato 'VotoMVP'.
  const VotoMVPFactory = await ethers.getContractFactory("VotoMVP");

  const network = await ethers.provider.getNetwork();
  console.log(`Rede alvo: ${network.name} (chainId: ${network.chainId})`);
  console.log("Fazendo deploy do contrato VotoMVP...");
  
  // 2. Inicia o processo de deploy. O Hardhat envia a transação para a rede.
  const contrato = await VotoMVPFactory.deploy();

  // 3. Espera a transação ser minerada e o contrato ser confirmado na blockchain.
  await contrato.waitForDeployment();

  const address = await contrato.getAddress();
  // 4. Uma vez confirmado, o contrato terá um endereço fixo na rede.
  //    Imprimimos este endereço no console para que possamos encontrá-lo e interagir com ele depois.
  console.log(`✅ Contrato VotoMVP implantado com sucesso em: ${address}`);
}

// Este é um padrão comum para executar scripts assíncronos e tratar erros.
// Ele garante que, se algo der errado durante o deploy, veremos o erro no console.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});