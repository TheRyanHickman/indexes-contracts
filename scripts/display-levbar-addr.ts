import { ethers } from "hardhat";

const main = async () => {
  const masterChefFactory = await ethers.getContractFactory("MasterChef");
  const master = masterChefFactory.attach(
    "0xA3fDF7F376F4BFD38D7C4A5cf8AAb4dE68792fd4"
  );
  const r = await master.startBlock();
  console.log(r.toString());
};

main();
