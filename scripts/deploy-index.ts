import { addresses, dontRedeploy, ownerAddr } from "./deploy";
import {
  getPancakeFactory,
  getPancakeLibrary,
  getPancakeRouter,
  getPancakeswapUtilities,
} from "../test/pancakeswap";
import hre, { ethers } from "hardhat";

import assert from "assert";

const network = hre.network.name;
const ownerWallet = ownerAddr[network as keyof typeof ownerAddr];
//assert(ownerWallet === "0x6DeBA0F8aB4891632fB8d381B27eceC7f7743A14");

const deployIndexController = async () => {
  if (dontRedeploy("indexController")) return;
  const owner = await ethers.getSigner(ownerWallet);

  const addrs = addresses[network];
  const ControllerFactory = await ethers.getContractFactory("IndexController", {
    libraries: {
      PancakeswapUtilities: addrs.pancakeUtilities,
    },
  });
  const ctr = await ControllerFactory.deploy(
    addrs.tokens.BUSD,
    addrs.LEV,
    addrs.SLEV,
    addrs.pancakeRouter,
    owner.address
  );
  console.log("INDEX CNTRLR ADDR", ctr.address);
};

const deployIndex = async () => {
  const addrs = addresses[network];
  const owner = await ethers.getSigner(ownerWallet);
  const indexFactory = await ethers.getContractFactory("IndexPool", {
    libraries: {
      PancakeswapUtilities: addrs.pancakeUtilities,
    },
  });
  const router = await getPancakeRouter(addrs.pancakeRouter);
  const factoryAddr = await router.factory();
  const factory = await getPancakeFactory(factoryAddr);
  const underlyingTokens = [
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
  ];
  const WBNB = await router.WETH();

  for (const tok of underlyingTokens) {
    if (tok === WBNB) continue;
    const pair = await factory.getPair(WBNB, tok);
    if (pair === "0x0000000000000000000000000000000000000000")
      throw new Error("Cannot find pair for token" + tok);
  }

  return;

  const ctr = await indexFactory.deploy(
    "LegacyIndex",
    "LI",
    [
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
    [30, 20, 15, 5, 5, 5, 5, 5, 5, 5],
    addrs.tokens.BUSD,
    addrs.pancakeRouter,
    addrs.indexController,
    [0],
    {
      gasLimit: 8000000,
    }
  );
  console.log("Waiting for confirm...");
  await ctr.deployed();
  console.log("INDEX DEPLOYED", ctr.address);
};

deployIndex();
