import { Contract } from "@ethersproject/contracts";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { addresses } from "./deploy";
import { deployLEV } from "./deploy-tokens";
import deployTeamSharing from "./deploy-team-sharing";
import { ethers } from "hardhat";
import { expandTo18Decimals } from "../test/utils";

const deploySushibar = async (rewardToken: string) => {
  const SushibarFactory = await ethers.getContractFactory("RewardBar");
  return SushibarFactory.deploy(rewardToken);
};

const deployMasterChef = async (
  LEV: Contract,
  BUSD: string,
  SLEV: Contract,
  owner: SignerWithAddress,
  teamSharing: Contract
) => {
  const MasterChefFactory = await ethers.getContractFactory("MasterChef");
  return MasterChefFactory.deploy(
    LEV.address,
    BUSD,
    SLEV.address,
    teamSharing.address,
    expandTo18Decimals(5),
    await ethers.provider.getBlockNumber()
  );
};

export const main = async () => {
  const [owner] = await ethers.getSigners();
  const addrs = addresses.mainnet;
  const teamSharing = await deployTeamSharing();
  await teamSharing.deployed();
  const LEV = await deployLEV(owner);
  const SLEV = await deploySushibar(LEV.address);
  const masterChef = await deployMasterChef(
    LEV,
    addrs.tokens.BUSD,
    SLEV,
    owner,
    teamSharing
  );

  await SLEV.transferOwnership(masterChef.address);
  await LEV.transferOwnership(masterChef.address);

  return {
    masterChef: masterChef.address,
    LEV: LEV.address,
    teamSharing: teamSharing.address,
    SLEV: SLEV.address,
  };
};

main().then(console.log);
