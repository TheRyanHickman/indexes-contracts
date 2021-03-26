import { ethers } from "hardhat";
import { expandTo18Decimals } from "../test/utils";

export const deploySLEV = async (owner: string) => {
  const SlevFactory = await ethers.getContractFactory("SLEVToken");
  return SlevFactory.deploy(owner, expandTo18Decimals(10000));
};

export const deployLEV = async (
  utilities: string,
  owner: string,
  router: string,
  slev: string,
  teamSharing: string
) => {
  const LevFactory = await ethers.getContractFactory("LEVToken", {
    libraries: {
      PancakeswapUtilities: utilities,
    },
  });
  return LevFactory.deploy(
    owner,
    expandTo18Decimals(10000),
    expandTo18Decimals(40),
    slev,
    router,
    teamSharing
  );
};
