import hre, { ethers } from "hardhat";

import { addresses } from "./deploy";
import slevArtifcat from "../artifacts/contracts/tokens/SLEVToken.sol/SLEVToken.json";

const setSlevMinter = async () => {
  const addrs = addresses.mainnet;
  const [owner] = await ethers.getSigners();
  const slev = new ethers.Contract(addrs.SLEV, slevArtifcat.abi, owner);
  const minters = await slev.getMinters();
  console.log("Minters:", minters);
  const tx = await slev.setMinters([owner.address, addrs.LEVStakingPool]);
  await tx.wait();
};

setSlevMinter();
