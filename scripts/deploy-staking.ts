import * as R from "ramda";

import { deployPair, getPancakeRouter } from "../test/pancakeswap";

import { Contract } from "@ethersproject/contracts";
import ERC20Artifact from "../artifacts/contracts/tokens/LEVToken.sol/LEVToken.json";
import { addresses } from "./deploy";
import { deployMockToken } from "../test/token";
import { deployPairWithPresets } from "./deploy-pair";
import { ethers } from "hardhat";
import { expandTo18Decimals } from "../test/utils";

export const getStakingControllerFactory = (putilities: string) => {
  return ethers.getContractFactory("StakingPoolController", {
    libraries: {
      PancakeswapUtilities: putilities,
    },
  });
};

export const deployStakingPool = async (
  stakingController: Contract,
  stakeToken: string,
  rewardTokens: string[],
  multipliers = [1]
) => {
  const tx = await stakingController.deployStakingPool(
    stakeToken,
    rewardTokens,
    multipliers
  );
  const receipt = await tx.wait();
  return receipt.events[0].args[0];
};

const ERC20 = async (addr: string) => {
  const [signer] = await ethers.getSigners();
  return new ethers.Contract(addr, ERC20Artifact.abi, signer);
};

export const deployStakingPools = async () => {
  const [owner] = await ethers.getSigners();
  const addrs = addresses.mainnet;
  const router = await getPancakeRouter(addrs.pancakeRouter);
  const stakingFactory = await getStakingControllerFactory(
    addrs.pancakeUtilities
  );
  const stakingController = await stakingFactory.deploy(owner.address);
  const fakeBUSD = await deployMockToken("BUSD", "BUSD", owner.address);

  const levslevlp = await deployPair(
    await ERC20(addrs.LEV),
    expandTo18Decimals(1000),
    await ERC20(addrs.SLEV),
    expandTo18Decimals(1000),
    router,
    owner
  );
  //  const levslevlp = await router.getPair(addrs.LEV, addrs.SLEV);
  //  console.log(levslevlp);
  const stakingPoolLEV = await deployStakingPool(
    stakingController,
    addrs.LEV,
    [addrs.LEV, addrs.tokens.BUSD],
    [1, 1]
  );
  const lp = await deployPairWithPresets(
    addrs.LEV,
    //    addrs.tokens.BUSD,
    fakeBUSD.address,
    router.address
  );
  const stakingPoolLEVBUSDLP = await deployStakingPool(stakingController, lp, [
    addrs.LEV,
  ]);
  const stakingPoolLEVBNBDLP = await deployStakingPool(
    stakingController,
    addrs.tokens.levbnblp,
    [addrs.LEV]
  );
  const deployed = {
    stakingPoolLEV: stakingPoolLEV,
    stakingPoolLEVBUSDLP,
    stakingPoolLEVBNBDLP,
    stakingController,
  };
  console.log(R.omit(["stakingController"], deployed));
  return deployed;
};

const deployBUSDLEVPool = async () => {
  const addrs = addresses.mainnet;
  await deployPairWithPresets(
    addrs.LEV,
    addrs.tokens.BUSD,
    addrs.pancakeRouter
  );
  await deployPairWithPresets(
    addrs.LEV,
    addrs.tokens.BUSD,
    addrs.pancakeRouter
  );
};

const deployPairsForLEVSLEV = async () => {
  const addrs = addresses.mainnet;
  await deployPairWithPresets(addrs.LEV, addrs.SLEV, addrs.pancakeRouter);
  //await deployPairWithPresets(
  //  addrs.tokens.BUSD,
  //  addrs.LEV,
  //  addrs.pancakeRouter
  //);
};

deployStakingPools();
