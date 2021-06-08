import { ethers, network } from "hardhat";

const env = network.name;

export const main = async () => {
  const addrs = require(`../addresses-${env}.json`);
  const MasterChefFactory = await ethers.getContractFactory("MasterChef");
  const masterChef = MasterChefFactory.attach(addrs.masterChef);
  const tx = await masterChef.add(1000, addrs.LI, false);
  console.log("waiting...");
  tx.wait();
};

//main();
