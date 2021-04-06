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
  let underlyingTokens = [
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
  const bnbContract = new ethers.Contract(WBNB, WBNBArtifact.abi, owner);
  if (network === "localhost") {
    const l = underlyingTokens.length;
    underlyingTokens = [];
    for (let i = 0; i < l; i++) {
      const fakeTok = await makeFakeToken(router, owner, bnbContract);
      underlyingTokens.push(fakeTok);
    }
    //underlyingTokens.push(WBNB);
  }

  for (const tok of underlyingTokens) {
    if (true || tok === WBNB) continue;
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

  const targetPriceWeights = [30, 20, 15, 5, 5, 5, 5, 5, 5, 5];
  const weights = await computeTargetWeights(
    underlyingTokens,
    targetPriceWeights,
    router,
    WBNB,
    addrs.tokens.BUSD
  );
  const tx = await controller.createIndexPool(
    "LegacyIndex",
    "LI",
    underlyingTokens,
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

//deployIndex(addresses.mainnet).then(console.log);
