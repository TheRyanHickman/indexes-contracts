import { ethers } from "hardhat";

export default async () => {
  const [owner] = await ethers.getSigners();

  const TokenSharingFactory = await ethers.getContractFactory("TokenSharing");
  const tokenSharing = await TokenSharingFactory.deploy(owner);
  await tokenSharing.deployed();
  return tokenSharing;
};
