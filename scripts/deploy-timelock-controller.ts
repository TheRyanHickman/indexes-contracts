import { ethers } from "hardhat";

export default async () => {
  const timelockFactory = await ethers.getContractFactory("TimelockController");
  const [multisigAddress] = await ethers.getSigners();
  return timelockFactory.deploy(
    24 * 3600,
    [multisigAddress],
    [multisigAddress]
  );
};
