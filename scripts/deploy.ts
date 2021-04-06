import { Contract, ContractFactory } from "@ethersproject/contracts";
import { deployLEV, deploySLEV } from "./deploy-tokens";
import {
  deployPair,
  deployPancakeExchange,
  deployPancakeUtilities,
  getPancakeRouter,
} from "../test/pancakeswap";
import { deployStakingPool, deployStakingPools } from "./deploy-staking";
import hre, { ethers } from "hardhat";

import { BigNumber } from "@ethersproject/bignumber";
import { deployController } from "./deploy-controller";
import { deployIndex } from "./deploy-index";
import { deployMockToken } from "../test/token";
import { expandTo18Decimals } from "../test/utils";
import fs from "fs";

export const deployConfig = {};

export let addresses: ContractAddresses = {
  mainnet: {
    pancakeUtilities: "0xaCf4b5C41C7890AB80De5802c1812b083A676be9",
    teamSharing: "0xa4BFc6dce86b7C9467F2d28497ca390E7f189066",
    pancakeRouter: "0x05fF2B0DB69458A0750badebc4f9e13aDd608C7F",
    SLEV: "0x50d080b1df4000BDE996343dB2bAE5581f45A760",
    LEV: "0x3E9B6dc7B5Bf558f16260b6C690D609760be32B3",
    LEVStakingPool: "0x03242a964BaEa52516BD39Ac7BBdFAa3dF60DD56",
    indexController: "0xfED73caf0cC69C40eFf4fC07ecAC2691049F3005",
    indexInstance: "0x53c858d6f6E0495C1f0031d78798289314F9C3E6",
    tokens: {
      BTCB: "",
      WETH: "",
      BUSD: "0xe9e7cea3dedca5984780bafc599bd69add087d56",
      WBNB: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
      levbnblp: "",
      levbusdlp: "",
    },
  },
};

export const main = async () => {
  const network = "mainnet";
  const addrs = addresses[network];
  const [owner] = await ethers.getSigners();
  const router = await getPancakeRouter(addrs.pancakeRouter);

  console.log(`Deploying all contracts to ${network} by ${owner.address}...`);
  const utilities = await deployPancakeUtilities();
  addrs.pancakeUtilities = utilities.address;
  const slev = await deploySLEV(owner.address);
  addrs.SLEV = slev.address;
  const teamSharing = await deployTeamSharing(owner.address, [
    addrs.SLEV,
    addrs.tokens.BUSD,
  ]);
  addrs.teamSharing = teamSharing.address;
  const lev = await deployLEV(
    addrs.pancakeUtilities,
    owner.address,
    addrs.pancakeRouter,
    addrs.SLEV,
    addrs.teamSharing
  );
  addrs.LEV = lev.address;

  const indexController = await deployController();
  addrs.indexController = indexController.address;
  try {
    await deployPair(
      lev,
      expandTo18Decimals(1000),
      slev,
      expandTo18Decimals(1000),
      router,
      owner
    );
  } catch (err) {
    console.log("weirdly fails.");
  }
  const [stakingPoolLEV] = await deployStakingPools();
  const deployed = {
    utilities: addrs.pancakeUtilities,
    slev: addrs.SLEV,
    lev: addrs.LEV,
    busd: addrs.tokens.BUSD,
    indexController: addrs.indexController,
    tokenSharing: addrs.teamSharing,
    stakingPoolLEV,
    router: addrs.pancakeRouter,
  };
  console.log(deployed);
  fs.writeFileSync(
    "./deployed-contracts.json",
    JSON.stringify(deployed, null, 2)
  );
};

const deployTestIndex = async (indexController: Contract) => {
  const network = hre.network.name;
  const tokensAddrs = addresses[network].tokens;
  console.log("Will deploy controller");
  await indexController.deployed();
  console.log("controller deployed");
  const tx = await indexController.createIndexPool(
    "Legacy Index",
    "LI",
    [tokensAddrs.BTCB, tokensAddrs.WETH, tokensAddrs.WBNB],
    [30, 20, 15],
    [0]
  );
  const receipt = await tx.wait();
  console.error("underlying tokens are", [
    tokensAddrs.WBNB,
    tokensAddrs.BTCB,
    tokensAddrs.WETH,
  ]);
  return await indexController.pools(0);
};

const deployTeamSharing = async (owner: string, tokens: string[]) => {
  const TokenSharingFactory = await ethers.getContractFactory("TokenSharing");
  const tokenSharing = await TokenSharingFactory.deploy(
    owner,
    tokens,
    deployConfig
  );
  console.log("Team sharing:", tokenSharing.address);
  return tokenSharing.deployed();
};

export const logPoint = () => {
  process.stdout.write(".");
};

type ContractAddresses = Record<
  string,
  {
    pancakeRouter: string;
    pancakeUtilities: string;
    teamSharing: string;
    LEV: string;
    SLEV: string;
    LEVStakingPool: string;
    indexController: string;
    indexInstance: string;
    tokens: {
      BTCB: string;
      WETH: string;
      BUSD: string;
      WBNB: string;
      levbusdlp: string;
      levbnblp: string;
    };
  }
>;
