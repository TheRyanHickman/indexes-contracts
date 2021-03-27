import { BigNumber, Contract, Wallet } from "ethers";
import { expandTo18Decimals, getLastBlock } from "./utils";

import FactoryAbi from "../abis/UniswapV2Factory.json";
import RouterAbi from "../abis/UniswapV2Router02.json";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers } from "hardhat";
import pancakeFactoryArtifact from "../pancakeswap-core-build/PancakeFactory.json";
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
  const pancakeFactory = new ethers.Contract(
    pancakeFactoryAddr,
    pancakeFactoryArtifact.abi
  ).connect(owner);
  let tx = await pancakeFactory.createPair(tokenA.address, tokenB.address);
  await tx.wait();
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
  mockBUSD: Contract,
  mockWETH: Contract,
  tokens: Record<string, { contract: Contract; liquidity: BigNumber }> = {}
) => {
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
    mockWETH.address
  );
  let pairs: Record<string, Contract> = {};

  for (const token of Object.keys(tokens)) {
    try {
      pairs[token] = await deployPair(
        mockBUSD,
        expandTo18Decimals(10000000), // $10,000,000
        tokens[token].contract,
        tokens[token].liquidity,
        pancakeRouter,
        owner
      );
    } catch (err) {
      console.log(err.message);
    }
  }
  return { pairs, pancakeRouter, pancakeFactory };
};

export const deployPancakeUtilities = async () => {
  const pancakeUtilities = await ethers.getContractFactory(
    "PancakeswapUtilities"
  );
  return await pancakeUtilities.deploy();
};
