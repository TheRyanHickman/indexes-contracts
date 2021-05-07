import { Contract } from "@ethersproject/contracts";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import WBNBArtifact from "../artifacts/contracts/tokens/WBNB.sol/WBNB.json";
import { addresses } from "./deploy";
import { deployLEV } from "./deploy-tokens";
import { deployPairWithPresets } from "./deploy-pair";
import deployTeamSharing from "./deploy-team-sharing";
import { ethers, network } from "hardhat";
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
    await ethers.provider.getBlockNumber(),
    {
      gasLimit: 5000000,
    }
  );
};

export const main = async () => {
  const [owner] = await ethers.getSigners();
  const addrs = addresses[network.name];
  const teamSharing = await deployTeamSharing();
  await teamSharing.deployed();
  console.log("Team sharing done");
  const LEV = await deployLEV(owner);
  console.log("LEV done");
  const SLEV = await deploySushibar(LEV.address);
  console.log("Sushibar done");
  const masterChef = await deployMasterChef(
    LEV,
    addrs.tokens.BUSD,
    SLEV,
    owner,
    teamSharing
  );
  console.log("masterchef done done");

  // obtain wbnb for liquidity
  const WBNB = new Contract(addrs.tokens.WBNB, WBNBArtifact.abi, owner);
  await WBNB.deposit({ value: expandTo18Decimals(2) });
  const LEVBNB = await deployPairWithPresets(
    LEV.address,
    addrs.tokens.WBNB,
    addrs.pancakeRouter
  );

  console.log("ok now lets deploy pair");
  const LEVBUSD = await deployPairWithPresets(
    LEV.address,
    addrs.tokens.BUSD,
    addrs.pancakeRouter,
    10000
  );

  await SLEV.transferOwnership(masterChef.address);
  await LEV.transferOwnership(masterChef.address);

  const tx = await masterChef.add(1000, LEVBNB, false);
  await tx.wait();
  await masterChef.add(1000, LEVBUSD, false);

  return {
    masterChef: masterChef.address,
    LEV: LEV.address,
    teamSharing: teamSharing.address,
    SLEV: SLEV.address,
    LEVBNB: 1,
    LEVBUSD: 2,
  };
};

main().then(console.log);
