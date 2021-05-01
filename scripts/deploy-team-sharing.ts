import { ethers } from "hardhat";

export default async () => {
  const [owner] = await ethers.getSigners();

  const TokenSharingFactory = await ethers.getContractFactory("TokenSharing");
  return await TokenSharingFactory.deploy(owner.address);
};
