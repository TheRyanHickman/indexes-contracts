import { ethers, network } from "hardhat";

import { Interface } from "@ethersproject/abi";

const env = network.name;
const addrs = require(`../addresses-mainnet.json`);

const getTimelock = async () => {
  const TimelockControllerFactory = await ethers.getContractFactory(
    "TimelockController"
  );
  return TimelockControllerFactory.attach(addrs.timelock);
};

const main = async () => {
  const timelock = await getTimelock();
  console.log("scheduling...");

  await timelock.schedule(
    addrs.masterChef,
    0,
    getCallData(),
    "0x0000000000000000000000000000000000000000000000000000000000000000",
    "0x0000000000000000000000000000000000000000000000000000000000000000",
    24 * 3600
  );
  console.log("Scheduled.");
};

const getCallData = () => {
  const abi = ["function add(uint256, address, bool)"];
  const iface = new Interface(abi);

  return iface.encodeFunctionData("add", [1000, addrs.DBI, true]);
};

const getChangeTimelockCalldata = (newDelay: number) => {
  const abi = ["function updateDelay(uint256)"];
  const iface = new Interface(abi);

  console.log(addrs.timelock);
  return iface.encodeFunctionData("updateDelay", [newDelay]);
};

const execute = async () => {
  const timelock = await getTimelock();
  const tx = await timelock.execute(
    addrs.masterChef,
    0,
    getCallData(),
    "0x0000000000000000000000000000000000000000000000000000000000000000",
    "0x0000000000000000000000000000000000000000000000000000000000000000"
  );
  await tx.wait();
};

const getOperationTimestamp = async () => {
  const timelock = await getTimelock();
  const calldata = getCallData();
  const hash = await timelock.hashOperation(
    addrs.masterChef,
    0,
    getCallData(),
    "0x0000000000000000000000000000000000000000000000000000000000000000",
    "0x0000000000000000000000000000000000000000000000000000000000000000"
  );
  const timestamp = await timelock.getTimestamp(hash);
  console.log(
    "operation timestamp",
    new Date(timestamp.toNumber()).toLocaleDateString()
  );
};

const setTimelockDuration = async (duration: number) => {
  const TimelockControllerFactory = await ethers.getContractFactory(
    "TimelockController"
  );
  const timelock = TimelockControllerFactory.attach(addrs.timelock);
  console.log("scheduling...");

  await timelock.schedule(
    addrs.timelock,
    0,
    getChangeTimelockCalldata(duration),
    "0x0000000000000000000000000000000000000000000000000000000000000000",
    "0x0000000000000000000000000000000000000000000000000000000000000000",
    24 * 3600
  );
  console.log("Scheduled.");
};

execute().then(console.log).catch(console.error);
