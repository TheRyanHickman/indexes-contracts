import { addresses } from "./deploy";
import { ethers } from "hardhat";
import slevArtifcat from "../artifacts/contracts/tokens/SLEVToken.sol/SLEVToken.json";

export const addSlevMinter = async (who: string) => {
  const addrs = addresses.mainnet;
  const owner = await ethers.getSigner(
    "0x6DeBA0F8aB4891632fB8d381B27eceC7f7743A14"
  );
  const slev = new ethers.Contract(addrs.SLEV, slevArtifcat.abi, owner);
  const minters = await slev.getMinters();
  console.log("Minters:", minters);
  const tx = await slev.setMinters([owner.address, who]);
  await tx.wait();
};
