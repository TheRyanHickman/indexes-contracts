import { getPancakeFactory, getPancakeRouter } from "../test/pancakeswap";
import hre, { ethers } from "hardhat";

import { Contract } from "@ethersproject/contracts";
import ControllerArtifact from "../artifacts/contracts/indexes/IndexController.sol/IndexController.json";
import { computeTargetWeights } from "./calculate-weights";
import fs from "fs";

let network = hre.network.name;
const addrs = require("../addresses-mainnet.json");

const deployIndexController = async (LEV: string, teamSharing: string) => {
  const [owner] = await ethers.getSigners();

  const ControllerFactory = await ethers.getContractFactory("IndexController", {
    libraries: {
      PancakeswapUtilities: addrs.pancakeUtilities,
    },
  });
  const ctr = await ControllerFactory.deploy(
    addrs.tokens.WBNB,
    addrs.tokens.BUSD,
    LEV,
    addrs.pancakeRouter,
    teamSharing,
    addrs.tokens.SLEV
  );
  return {
    controller: ctr,
  };
};

export const indexesDesc = {
  LI: {
    name: "Legacy Index",
    symbol: "LI",
    weights: [30, 20, 15, 5, 5, 5, 5, 5, 5, 5],
    underlyingTokens: [
      "0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c",
      "0x2170ed0880ac9a755fd29b2688956bd959f933f8",
      "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
      "0x7083609fce4d1d8dc0c979aab8c869ea2c873402",
      "0xf8a0bf9cf54bb92f17374d9e9a321e6a111a51bd",
      "0x3ee2200efb3400fabb9aacf31297cbdd1d435d47",
      "0x4338665cbb7b2485a8855a139b75d5e34ab0db94",
      "0x0eb3a705fc54725037cc9e008bdede697f62f335",
      "0xbf5140a22578168fd562dccf235e5d43a02ce9b1",
      "0x8ff795a6f4d97e7887c79bea79aba5cc76444adf",
    ],
  },
  /*
  12.5% WBNB 
12.5% XVS 
12.5% SXP 
12.5% CAKE 
10% BAKE 
10% AUTO 
10% BIFI
10% 1inch
2.5% ACS
2.5% BSCPAD 
2.5% LEV
2.5% BUNNY
  */
  DBI: {
    name: "DefiBSCIndex",
    symbol: "DBI",
    weights: [25, 25, 25, 25, 20, 20, 20, 20, 5, 5, 5, 5],
    underlyingTokens: [
      "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
      "0xcf6bb5389c92bdda8a3747ddb454cb7a64626c63",
      "0x47bead2563dcbf3bf2c9407fea4dc236faba485a",
      "0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82",
      "0xE02dF9e3e622DeBdD69fb838bB799E3F168902c5",
      "0xa184088a740c695e156f91f5cc086a06bb78b827",
      "0xCa3F508B8e4Dd382eE878A314789373D80A5190A",
      "0x111111111117dc0aa78b770fa6a738034120c302",
      "0x4197c6ef3879a08cd51e5560da5064b773aa1d29",
      "0x5a3010d4d8d3b5fb49f8b6e57fb9e48063f16700",
      "0x304c62b5B030176F8d328d3A01FEaB632FC929BA",
      "0xc9849e6fdb743d08faee3e34dd2d1bc69ea11a51",
    ],
  },
  SI: {
    name: "Stable Index",
    symbol: "SI",
    weights: [1, 1, 1],
    underlyingTokens: [
      "0xe9e7cea3dedca5984780bafc599bd69add087d56",
      "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d",
      "0x55d398326f99059ff775485246999027b3197955",
    ],
  },
  TEST: {
    name: "Test Index",
    symbol: "TEST",
    weights: [30, 20, 15, 5, 5, 5, 5, 5, 5, 5],
    underlyingTokens: [
      "0x6Ab7bFC2495B51535F11dA50EC4Dc936Aae6bB85",
      "0x718a2BA87109147331Ca3b7B666aa3258F233D61",
      "0xEdf41181fE36DC260AAD6c9fc2a765950d2d72A1",
      "0x56d6436BeaC309F4FB47f36795776fA00736582e",
      "0x8745a90B930F88F65dae706dd53b0d95efA0f3D5",
      "0x1284a02705B515805e36c398475e426F2F732E2C",
      "0x80b35F06ADc4C09c20461fCB0AEBFe06AE549CED",
      "0x3173a6F693CA8a97f41606F9aCAc00946070DE70",
      "0xb5234cEe66Da83b325bd647C640D9b1423e36BAE",
      "0x9FFD2e176D968d2FA069d74316d780B0aCB3D3DC",
    ],
  },
};

export const deployIndex = async (
  addrs: any,
  indexController: string,
  indexKey: "LI" | "DBI" | "TEST" | "SI"
) => {
  console.log("Note: make sure to update controller if index pool was updated");
  const [owner] = await ethers.getSigners();
  const router = await getPancakeRouter(addrs.pancakeRouter);

  const factoryAddr = await router.factory();
  const factory = await getPancakeFactory(factoryAddr);

  const WBNB = await router.WETH();
  const activeIndex = indexesDesc[indexKey];
  for (const tok of activeIndex.underlyingTokens) {
    if (tok === WBNB) continue;
    const pair = await factory.getPair(WBNB, tok);
    if (pair === "0x0000000000000000000000000000000000000000") {
      throw new Error("Cannot find pair for token" + tok);
    }
  }

  const controller = new ethers.Contract(
    indexController,
    ControllerArtifact.abi,
    owner
  );
  let weights = await computeTargetWeights(
    activeIndex.underlyingTokens,
    activeIndex.weights,
    router,
    WBNB,
    addrs.tokens.BUSD
  );
  weights = weights.map((w) => (w > 6000 ? 6000 : w));
  if (indexKey === "SI") weights = [334, 333, 333];

  const tx = await controller.createIndexPool(
    activeIndex.name,
    activeIndex.symbol,
    activeIndex.underlyingTokens,
    weights,
    [0],
    {
      gasLimit: 5000000,
    }
  );
  const receipt = await tx.wait();
  return receipt.events[3].args.index;
};

const main = async (deployController: boolean) => {
  let controller: Contract;

  if (deployController) {
    controller = (
      await deployIndexController(addrs.tokens.LEV, addrs.teamSharing)
    ).controller;
  } else {
    controller = new ethers.Contract(
      addrs.controller,
      ControllerArtifact.abi,
      (await ethers.getSigners())[0]
    );
  }

  if (false && network !== "mainnet") {
    return {
      TEST: await deployIndex(addrs, controller.address, "TEST"),
      controller: controller.address,
    };
  }
  return {
    ...addrs,
    // LI: await deployIndex(addrs, controller.address, "LI"),
    // DBI: await deployIndex(addrs, controller.address, "DBI"),
    SI: await deployIndex(addrs, controller.address, "SI"),
    controller: controller.address,
  };
};

main(false).then((result) => {
  if (!result) return;
  console.log(result);
  fs.writeFileSync(
    `addresses-${network}.json`,
    JSON.stringify(result, null, 2)
  );
});
