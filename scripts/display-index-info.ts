import { ethers } from "hardhat";
import { network } from "hardhat";

const main = async () => {
  const env = network.name;
  const addresses = require(`../addresses-${env}.json`);
  const indexFactory = await ethers.getContractFactory("IndexPool", {
    libraries: {
      PancakeswapUtilities: addresses.pancakeUtilities,
    },
  });
  const index = await indexFactory.attach(addresses.DBI);
  console.log(await index.getComposition());
};

main();
