import { ethers } from "hardhat";
import { expandTo18Decimals } from "./utils";

export const deployMockToken = async (
  name: string,
  symbol: string,
  owner: string
) => {
  const Token = await ethers.getContractFactory("MockERC20");
  const contract = await Token.deploy(
    name,
    symbol,
    expandTo18Decimals(100000000) // 100,000,000
  );
  await contract.deployed();
  return contract;
};
