import { BigNumber, Contract } from "ethers";
import {
  deployPair,
  deployPancakeUtilities,
  getPancakeFactory,
  getPancakeLibrary,
  getPancakeRouter,
  getPancakeswapUtilities,
} from "../test/pancakeswap";
import hre, { ethers } from "hardhat";

import ControllerArtifact from "../artifacts/contracts/indexes/IndexController.sol/IndexController.json";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import WBNBArtifact from "../artifacts/contracts/tokens/WBNB.sol/WBNB.json";
import { addresses } from "./deploy";
import assert from "assert";
import { computeTargetWeights } from "./calculate-weights";
import { deployController } from "./deploy-controller";
import { deployMockToken } from "../test/token";
import { expandTo18Decimals } from "../test/utils";

let network = "mainnet";
//assert(ownerWallet === "0x6DeBA0F8aB4891632fB8d381B27eceC7f7743A14");

const deployIndexController = async (addresses: any) => {
  const [owner] = await ethers.getSigners();

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

export const deployIndex = async (addrs: any) => {
  console.log("Note: make sure to update controller if index pool was updated");
  const [owner] = await ethers.getSigners();
  const router = await getPancakeRouter(addrs.pancakeRouter);

  const factoryAddr = await router.factory();
  const factory = await getPancakeFactory(factoryAddr);

  const indexesDesc = {
    LI: {
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
    DBI: {
      name: "DefiBSCIndex",
      weights: [30, 25, 25, 25, 20, 20, 20, 10, 5, 5, 5],
      underlyingTokens: [
        "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
        "0xcf6bb5389c92bdda8a3747ddb454cb7a64626c63",
        "0x47bead2563dcbf3bf2c9407fea4dc236faba485a",
        "0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82",
        "0xE02dF9e3e622DeBdD69fb838bB799E3F168902c5",
        "0xa184088a740c695e156f91f5cc086a06bb78b827",
        "0xCa3F508B8e4Dd382eE878A314789373D80A5190A",
        "0x4197c6ef3879a08cd51e5560da5064b773aa1d29",
        "0xc2e1acef50ae55661855e8dcb72adb182a3cc259",
        "0x0d9319565be7f53cefe84ad201be3f40feae2740",
        "0xc9849e6fdb743d08faee3e34dd2d1bc69ea11a51",
      ],
    },
  };

  const WBNB = await router.WETH();
  const bnbContract = new ethers.Contract(WBNB, WBNBArtifact.abi, owner);
  const activeIndex = indexesDesc.DBI;
  for (const tok of activeIndex.underlyingTokens) {
    if (tok === WBNB) continue;
    const pair = await factory.getPair(WBNB, tok);
    if (pair === "0x0000000000000000000000000000000000000000") {
      if (network === "mainnet")
        throw new Error("Cannot find pair for token" + tok);
      else console.log("Warning missing pair");
    }
  }

  const controller = new ethers.Contract(
    addrs.indexController,
    ControllerArtifact.abi,
    owner
  );
  //  const targetPriceWeights =
  const weights = await computeTargetWeights(
    activeIndex.underlyingTokens,
    activeIndex.weights,
    router,
    WBNB,
    addrs.tokens.BUSD
  );
  const tx = await controller.createIndexPool(
    activeIndex.name,
    "DBI",
    activeIndex.underlyingTokens,
    weights,
    [0],
    {
      gasLimit: 5000000,
    }
  );
  console.log("Waiting for confirm...", tx.address);
  const receipt = await tx.wait();
  console.log(receipt);
  return receipt.events[1].args.index;
};

const makeFakeToken = async (
  router: any,
  owner: SignerWithAddress,
  BNB: Contract
) => {
  const tok = await deployMockToken("foobar", "FOOBAR", owner.address);
  console.log(
    "will deploy pair. balance wbnb",
    (await BNB.balanceOf(owner.address)).toString()
  );
  await deployPair(
    BNB,
    expandTo18Decimals(100),
    tok,
    expandTo18Decimals(1000),
    router,
    owner
  );
  return tok.address;
};

//deployPancakeUtilities().then((utilities) => {
//  const addrs = addresses.mainnet;
//  console.log("deployed utilities at", utilities.address);
//  addrs.pancakeUtilities = utilities.address;
//
//  deployController().then((ctrl) => {
//    addrs.indexController = ctrl.address;
//    console.log("controller is at ", ctrl.address);
//    deployIndex(addresses.mainnet).then(console.log);
//  });
//});

deployIndex(addresses.mainnet).then(console.log);
