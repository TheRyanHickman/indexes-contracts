import { ethers, network } from "hardhat";

const devTeam = "0x9d687619DE58580270a992332252479aF5dbbe10";
const env = network.name;

async function main() {
  // transfer timelock ownership to the multisig
  const [owner] = await ethers.getSigners();
  const addresses = require(`../addresses-${env}.json`);
  const timelockFactory = await ethers.getContractFactory("TimelockController");
  const timelock = await timelockFactory.attach(addresses.timelock);
  const adminRole = await timelock.TIMELOCK_ADMIN_ROLE();
  await timelock.grantRole(adminRole, devTeam);
  await timelock.revokeRole(adminRole, owner.address);

  const indexPoolFactory = await ethers.getContractFactory("IndexPool", {
    libraries: {
      PancakeswapUtilities: addresses.pancakeUtilities,
    },
  });
  const LI = await indexPoolFactory.attach(addresses.LI);
  await LI.transferOwnership(timelock.address);
  const DBI = await indexPoolFactory.attach(addresses.DBI);
  await DBI.transferOwnership(timelock.address);

  console.log("done");
}

main();
