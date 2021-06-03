import { ethers, network } from "hardhat";

import { Interface } from "@ethersproject/abi";

const env = network.name;
const addrs = require(`../addresses-${env}.json`);

const main = async () => {
  const TimelockControllerFactory = await ethers.getContractFactory(
    "TimelockController"
  );
  const timelock = TimelockControllerFactory.attach(addrs.timelock);
  console.log("scheduling...");

  await timelock.schedule(
    addrs.masterChef,
    0,
    getCallData(),
    "0x0000000000000000000000000000000000000000000000000000000000000000",
    "0x0000000000000000000000000000000000000000000000000000000000000000",
    20
  );
  console.log("Scheduled.");
};

const getCallData = () => {
  const abi = ["function add(uint256, address, bool)"];
  const iface = new Interface(abi);

  return iface.encodeFunctionData("add", [
    1000,
    "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
    true,
  ]);
};

const execute = async () => {
  const TimelockControllerFactory = await ethers.getContractFactory(
    "TimelockController"
  );
  const timelock = TimelockControllerFactory.attach(addrs.timelock);
  const tx = await timelock.execute(
    addrs.masterChef,
    0,
    getCallData(),
    "0x0000000000000000000000000000000000000000000000000000000000000000",
    "0x0000000000000000000000000000000000000000000000000000000000000000"
  );
  await tx.wait();
};

execute().then(console.log).catch(console.error);
