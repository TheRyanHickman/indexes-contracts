import hre, { ethers } from "hardhat";

import { addresses } from "./deploy";
import slevArtifcat from "../artifacts/contracts/tokens/SLEVToken.sol/SLEVToken.json";

const setSlevMinter = async () => {
  const addrs = addresses.mainnet;
  const [owner] = await ethers.getSigners();
  const slev = new ethers.Contract(addrs.SLEV, slevArtifcat.abi, owner);
  const tx = await slev.setMinter("0x73511669fd4dE447feD18BB79bAFeAC93aB7F31f");
  await tx.wait();
};

setSlevMinter();
