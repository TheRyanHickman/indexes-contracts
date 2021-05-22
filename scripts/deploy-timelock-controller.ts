import { ethers } from "hardhat";

export default async () => {
  const timelockFactory = await ethers.getContractFactory("TimelockController");
  const [multisigWallet] = await ethers.getSigners();
  return timelockFactory.deploy(
    24 * 3600,
    [multisigWallet.address],
    [multisigWallet.address]
  );
};
