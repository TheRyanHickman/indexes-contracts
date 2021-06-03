import { ethers, network } from "hardhat";

import fs from "fs";

const env = network.name;

export const deployPancakeUtilities = async () => {
  const pancakeUtilities = await ethers.getContractFactory(
    "PancakeswapUtilities"
  );
  const addrs = require(`../addresses-${env}.json`);
  const utilities = await pancakeUtilities.deploy();
  return {
    ...addrs,
    pancakeUtilities: utilities.address,
  };
};

deployPancakeUtilities().then((result) => {
  console.log(result);
  fs.writeFileSync(`addresses-${env}.json`, JSON.stringify(result, null, 2));
});
