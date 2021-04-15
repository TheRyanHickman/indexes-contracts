import { BigNumber, Contract, ContractFactory, Wallet } from "ethers";
import { expandTo18Decimals, getLastBlock } from "./utils";
import hre, { ethers } from "hardhat";

import FactoryAbi from "../abis/UniswapV2Factory.json";
import RouterAbi from "../abis/UniswapV2Router02.json";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { addresses } from "../scripts/deploy";
import pancakeFactoryArtifact from "../pancakeswap-core-build/PancakeFactory.json";
import pancakeLibraryArtifact from "../pancakeswap-periphery-build/PancakeLibrary.json";
import pancakeRouterArtifact from "../pancakeswap-periphery-build/PancakeRouter.json";
import pancakeswapUtilities from "../artifacts/contracts/utilities/PancakeswapUtilities.sol/PancakeswapUtilities.json";
import uniswapPairArtifact from "../abis/UniswapV2Pair.json";

export const deployPair = async (
  tokenA: Contract,
  tokenAAmount: BigNumber,
  tokenB: Contract,
  tokenBAmount: BigNumber,
  router: Contract,
  owner: SignerWithAddress
): Promise<Contract> => {
  const pancakeFactoryAddr = await router.factory();
  const pancakeFactory = await getPancakeFactory(pancakeFactoryAddr);
  const possiblePair = await pancakeFactory.getPair(
    tokenA.address,
    tokenB.address
  );
  if (hre.network.name !== "hardhat" && possiblePair) {
    console.log("Pair already exists at", possiblePair);
    return new ethers.Contract(
      possiblePair,
      uniswapPairArtifact.abi,
      router.signer
    );
  }
  let tx;
  try {
    tx = await pancakeFactory.createPair(tokenA.address, tokenB.address);
    await tx.wait();
  } catch (err) {
    console.error(err.message);
  }
  const pair = await pancakeFactory.getPair(tokenA.address, tokenB.address);
  tx = await tokenA.approve(router.address, tokenAAmount);
  await tx.wait();
  tx = await tokenB.approve(router.address, tokenBAmount);
  await tx.wait();
  const block = await getLastBlock(router.provider);

  await router.addLiquidity(
    tokenA.address,
    tokenB.address,
    tokenAAmount,
    tokenBAmount,
    tokenAAmount,
    tokenBAmount,
    owner.address,
    block.timestamp + 600
  );
  return new ethers.Contract(pair, uniswapPairArtifact.abi, router.signer);
};

export const deployPancakeExchange = async (
  owner: SignerWithAddress,
  tokens: Record<string, { contract: Contract; liquidity: BigNumber }> = {}
) => {
  const BNBFactory = await ethers.getContractFactory("WBNB");
  const BNB = await BNBFactory.deploy();
  await BNB.deposit({ value: expandTo18Decimals(30000) });
  const Router = await ethers.getContractFactory(
    RouterAbi.abi,
    RouterAbi.bytecode
  );
  const PancakeFactory = await ethers.getContractFactory(
    FactoryAbi.abi,
    FactoryAbi.bytecode
  );
  const pancakeFactory = await PancakeFactory.deploy(owner.address);
  const pancakeRouter: Contract = await Router.deploy(
    pancakeFactory.address,
    BNB.address
  );
  let pairs: Record<string, Contract> = {};

  for (const token of Object.keys(tokens)) {
    try {
      pairs[token] = await deployPair(
        BNB,
        expandTo18Decimals(500),
        tokens[token].contract,
        tokens[token].liquidity,
        pancakeRouter,
        owner
      );
    } catch (err) {
      console.log("Deploy pair", err.message);
      throw err;
    }
  }
  return { pairs, pancakeRouter, pancakeFactory, WBNB: BNB };
};

export const deployPancakeUtilities = async () => {
  const pancakeUtilities = await ethers.getContractFactory(
    "PancakeswapUtilities"
  );
  const utilities = await pancakeUtilities.deploy();
  return utilities;
};

export const getPancakeRouter = async (address: string) => {
  const [signer] = await ethers.getSigners();
  return new Contract(address, pancakeRouterArtifact.abi, signer);
};

export const getPancakeLibrary = async (address: string) => {
  const [signer] = await ethers.getSigners();
  return new Contract(address, pancakeLibraryArtifact.abi, signer);
};

export const getPancakeswapUtilities = async (address: string) => {
  const [signer] = await ethers.getSigners();
  return new Contract(address, pancakeswapUtilities.abi, signer);
};

export const getPancakeFactory = async (address: string) => {
  const [signer] = await ethers.getSigners();
  return new ethers.Contract(address, pancakeFactoryArtifact.abi, signer);
};
