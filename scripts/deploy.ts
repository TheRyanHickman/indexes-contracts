import {
  deployPair,
  deployPancakeUtilities,
  getPancakeRouter,
} from "../test/pancakeswap";
import hre, { ethers } from "hardhat";

import { Contract } from "@ethersproject/contracts";
import { deployLEV } from "./deploy-tokens";
import { expandTo18Decimals } from "../test/utils";
import fs from "fs";

export const deployConfig = {};

export let addresses: ContractAddresses = {
  mainnet: {
    pancakeUtilities: "0xaCf4b5C41C7890AB80De5802c1812b083A676be9",
    teamSharing: "0xa4BFc6dce86b7C9467F2d28497ca390E7f189066",
    pancakeRouter: "0x10ED43C718714eb63d5aA57B78B54704E256024E",
    SLEV: "0x50d080b1df4000BDE996343dB2bAE5581f45A760",
    LEVStakingPool: "0x03242a964BaEa52516BD39Ac7BBdFAa3dF60DD56",
    indexController: "0xfED73caf0cC69C40eFf4fC07ecAC2691049F3005",
    indexInstance: "0x53c858d6f6E0495C1f0031d78798289314F9C3E6",
    tokens: {
      LEV: "0x3E9B6dc7B5Bf558f16260b6C690D609760be32B3",
      BTCB: "",
      WETH: "",
      BUSD: "0xe9e7cea3dedca5984780bafc599bd69add087d56",
      WBNB: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
      levbnblp: "0x1853685FCD60CAbf0285CD407D6A0De1BEbc8aa4",
      levbusdlp: "",
    },
  },
  localhost: {
    pancakeUtilities: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    pancakeRouter: "0x0B306BF915C4d645ff596e518fAf3F9669b97016",
    teamSharing: "0x162A433068F51e18b7d13932F27e66a3f99E6890",
    tokens: {
      LEV: "0x922D6956C99E12DFeB3224DEA977D0939758A1Fe",
      BUSD: "0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e",
      WBNB: "0xA51c1fc2f0D1a1b8494Ed1FE312d7C3a78Ed91C0",
    },
  },
  testnet: {
    pancakeUtilities: "0x72E8766a70a3537093CADe871c9100EbF9e808e7",
    pancakeRouter: "0xc58165C9643D023f1BFCFb05e0deF3C1dFFeb5A5",
    masterChef: "0xefc4f6103318635D2F96628a8252669c116b1fe4",
    teamSharing: "0x281738E8Ba2064654c8CBF8b5e223269684E7AAc",
    indexController: "0xC40c373a370Ab76f25f987eBFA3Dad0dc4219944",
    // TEST: "0x59a51A8B58F269ad4BF2Bfc1f4c99293CEE83924",
    tokens: {
      LEV: "0x33f1c33d0154660a2Ff122e877aED1233ffa4B15",
      BUSD: "0xb16EEC50D66F3F799d8f24FbE05f000f93720bD9",
      WBNB: "0xB6C14149edbf08608ea56cC14B52Da7527CA78b0",
    },
  },
};

// deprecated!
export const main = async () => {
  const [owner] = await ethers.getSigners();
  const utilities = await deployPancakeUtilities();
  const network = "mainnet";
  const addrs = addresses[network];
  const router = await getPancakeRouter(addrs.pancakeRouter);

  console.log(`Deploying all contracts to ${network} by ${owner.address}...`);
  addrs.pancakeUtilities = utilities.address;

  const deployed = {
    utilities: addrs.pancakeUtilities,
    slev: addrs.SLEV,
    lev: addrs.tokens.LEV,
    busd: addrs.tokens.BUSD,
    indexController: addrs.indexController,
    tokenSharing: addrs.teamSharing,
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

export const logPoint = () => {
  process.stdout.write(".");
};

type ContractAddresses = Record<
  string,
  Partial<{
    pancakeRouter: string;
    pancakeUtilities: string;
    teamSharing: string;
    masterChef: string;
    SLEV: string;
    LEVStakingPool: string;
    indexController: string;
    indexInstance: string;
    tokens: Partial<{
      LEV: string;
      BTCB: string;
      WETH: string;
      BUSD: string;
      WBNB: string;
      levbusdlp: string;
      levbnblp: string;
    }>;
  }>
>;

//main();
