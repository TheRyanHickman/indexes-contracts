import { deployPair } from "../test/pancakeswap";
import { ethers } from "hardhat";
import { expandTo18Decimals } from "../test/utils";

export const getStakingPoolFactory = (putilities: string) => {
  return ethers.getContractFactory("LEVStackingPool", {
    libraries: {
      PancakeswapUtilities: putilities,
    },
  });
};

export const deployStakingPool = async (
  pancakeswapUtilities: string,
  SLEV: string,
  stakeToken: string,
  rewardTokens: string[],
  router: string
) => {
  const stakingFactory = await getStakingPoolFactory(pancakeswapUtilities);
  const stakingPool = await stakingFactory.deploy(
    SLEV,
    stakeToken,
    rewardTokens,
    [expandTo18Decimals(1)],
    router
  );
  return stakingPool.address;
};
