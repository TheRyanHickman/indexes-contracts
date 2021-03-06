import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers } from "hardhat";
import { expandTo18Decimals } from "../test/utils";

export const deployLEV = async (owner: SignerWithAddress) => {
  const LevFactory = await ethers.getContractFactory("LEVToken");
  return LevFactory.deploy(
    owner.address,
    expandTo18Decimals(10000000) // 10,000,000
  );
};
