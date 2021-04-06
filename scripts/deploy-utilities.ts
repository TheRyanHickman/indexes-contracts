import { ethers } from "hardhat";

export const deployPancakeUtilities = async () => {
  const pancakeUtilities = await ethers.getContractFactory(
    "PancakeswapUtilities"
  );
  const utilities = await pancakeUtilities.deploy();
  return utilities.address;
};

//deployPancakeUtilities().then(console.log);
