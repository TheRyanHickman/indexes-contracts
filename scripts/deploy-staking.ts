import * as R from "ramda";

import { deployPair, getPancakeRouter } from "../test/pancakeswap";

import { Contract } from "@ethersproject/contracts";
import ERC20Artifact from "../artifacts/contracts/tokens/LEVToken.sol/LEVToken.json";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { addresses } from "./deploy";
import { deployLEV } from "./deploy-tokens";
import deployTeamSharing from "./deploy-team-sharing";
import { ethers } from "hardhat";
import { expandTo18Decimals } from "../test/utils";

const deploySushibar = async (
  name: string,
  symbol: string,
  rewardToken: string
) => {
  const SushibarFactory = await ethers.getContractFactory("RewardBar");
  return SushibarFactory.deploy(name, symbol, rewardToken);
};

const deployMasterChef = async (
  LEV: Contract,
  SLEV: Contract,
  SBUSD: Contract,
  owner: SignerWithAddress,
  teamSharing: Contract
) => {
  const MasterChefFactory = await ethers.getContractFactory("MasterChef");
  return MasterChefFactory.deploy(
    LEV.address,
    SLEV.address,
    SBUSD.address,
    teamSharing.address,
    expandTo18Decimals(5),
    await ethers.provider.getBlockNumber()
  );
};

export const main = async () => {
  const [owner] = await ethers.getSigners();
  const addrs = addresses.mainnet;
  const teamSharing = await deployTeamSharing();
  const LEV = await deployLEV(owner);
  const SLEV = await deploySushibar("rewards LEV", "SLEV", LEV.address);
  const SBUSD = await deploySushibar(
    "rewards BUSD",
    "SBUSD",
    addrs.tokens.BUSD
  );
  const masterChef = await deployMasterChef(
    LEV,
    SLEV,
    SBUSD,
    owner,
    teamSharing
  );
  return {
    masterChef: masterChef.address,
    LEV: LEV.address,
    teamSharing: teamSharing.address,
  };
};

main().then(console.log);
