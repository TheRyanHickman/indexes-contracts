import { ethers } from "hardhat";
import fs from "fs";

export const deployPancakeUtilities = async () => {
  const pancakeUtilities = await ethers.getContractFactory(
    "PancakeswapUtilities"
  );
  const addrs = require("../addresses-mainnet.json");
  const utilities = await pancakeUtilities.deploy();
  return {
    ...addrs,
    pancakeUtilities: utilities.address,
  };
};

deployPancakeUtilities().then((result) => {
  console.log(result);
  fs.writeFileSync("addresses-mainnet.json", JSON.stringify(result, null, 2));
});
