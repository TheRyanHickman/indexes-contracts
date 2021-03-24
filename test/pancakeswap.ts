import { BigNumber, Contract } from "ethers";
import { expandTo18Decimals, getLastBlock } from "./utils";

import { ethers } from "hardhat";
import otherthingy from "../abis/UniswapV2Factory.json";
import thingy from "../abis/UniswapV2Router02.json";
import uniswapPairAbi from "../abis/UniswapV2Pair.json";

export const deployPair = async (
  pancakeFactory: Contract,
  tokenA: Contract,
  tokenAAmount: BigNumber,
  tokenB: Contract,
  tokenBAmount: BigNumber,
  router: Contract,
  owner: string
): Promise<Contract> => {
  await pancakeFactory.createPair(tokenA.address, tokenB.address);
  const pair = await pancakeFactory.getPair(tokenA.address, tokenB.address);
  tokenA.approve(router.address, tokenAAmount);
  tokenB.approve(router.address, tokenBAmount);
  const block = await getLastBlock(router.provider);

  await router.addLiquidity(
    tokenA.address,
    tokenB.address,
    tokenAAmount,
    tokenBAmount,
    tokenAAmount,
    tokenBAmount,
    owner,
    block.timestamp + 600
  );
  return new ethers.Contract(pair, uniswapPairAbi.abi, router.signer);
};

export const deployPancakeExchange = async (
  owner: string,
  mockBUSD: Contract,
  mockWETH: Contract,
  tokens: Record<string, { contract: Contract; liquidity: BigNumber }>
) => {
  const Router = await ethers.getContractFactory(thingy.abi, thingy.bytecode);
  const PancakeFactory = await ethers.getContractFactory(
    otherthingy.abi,
    otherthingy.bytecode
  );
  const pancakeFactory = await PancakeFactory.deploy(owner);
  const pancakeRouter: Contract = await Router.deploy(
    pancakeFactory.address,
    mockWETH.address
  );
  let pairs: Record<string, Contract> = {};

  for (const token of Object.keys(tokens)) {
    pairs[token] = await deployPair(
      pancakeFactory,
      mockBUSD,
      expandTo18Decimals(10000000), // $10,000,000
      tokens[token].contract,
      tokens[token].liquidity,
      pancakeRouter,
      owner
    );
  }
  return { pairs, pancakeRouter, pancakeFactory };
};

export const deployPancakeUtilities = async () => {
  const PancakeUtilities = await ethers.getContractFactory(
    "PancakeswapUtilities"
  );
  return await PancakeUtilities.deploy();
};
