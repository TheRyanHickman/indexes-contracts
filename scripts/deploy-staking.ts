import { Contract } from "@ethersproject/contracts";
import fs from "fs";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import WBNBArtifact from "../artifacts/contracts/tokens/WBNB.sol/WBNB.json";
import { deployLEV } from "./deploy-tokens";
import { deployPairWithPresets } from "./deploy-pair";
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
    expandTo18Decimals(4), // 4 LEV per block!
    await ethers.provider.getBlockNumber(),
    {
      gasLimit: 5000000,
    }
  );
};

export const main = async () => {
  const [owner] = await ethers.getSigners();
  const addrs = require("../addresses-mainnet.json");
  const teamSharing = await deployTeamSharing();
  await teamSharing.deployed();
  console.log("Team sharing done");
  const LEV = await deployLEV(owner);
  console.log("LEV done");
  await LEV.deployed();
  const SLEV = await deploySushibar(LEV.address);
  await SLEV.deployed();
  console.log("Sushibar done");
  const masterChef = await deployMasterChef(
    LEV,
    addrs.tokens.BUSD,
    SLEV,
    owner,
    teamSharing
  );
  await masterChef.deployed();
  console.log("masterchef done done");

  // obtain wbnb for liquidity
  const WBNB = new Contract(addrs.tokens.WBNB, WBNBArtifact.abi, owner);
  const tx2 = await WBNB.deposit({ value: expandTo18Decimals(2) });
  await tx2.wait();
  console.log("ok now lets deploy pairs");
  const LEVBNB = await deployPairWithPresets(
    LEV.address,
    addrs.tokens.WBNB,
    addrs.pancakeRouter,
    0.032
  );

  const LEVBUSD = await deployPairWithPresets(
    LEV.address,
    addrs.tokens.BUSD,
    addrs.pancakeRouter,
    20
  );

  const tx3 = await SLEV.transferOwnership(masterChef.address);
  tx3.wait();
  const tx4 = await LEV.transferOwnership(masterChef.address);
  tx4.wait();

  const tx = await masterChef.add(1000, LEVBNB, false);
  await tx.wait();
  await masterChef.add(1000, LEVBUSD, false);

  return {
    ...addrs,
    masterChef: masterChef.address,
    teamSharing: teamSharing.address,
    tokens: {
      ...addrs.tokens,
      LEV: LEV.address,
      SLEV: SLEV.address,
      LEVBNB,
      LEVBUSD,
    },
    LEVBNB: 1,
    LEVBUSD: 2,
  };
};

main().then((result) => {
  console.log(result);
  fs.writeFileSync("addresses-mainnet.json", JSON.stringify(result, null, 2));
});
