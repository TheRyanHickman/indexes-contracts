import { addresses, logPoint, ownerAddr } from "./deploy";
import hre, { ethers } from "hardhat";

export const deployController = async () => {
  const networkName = hre.network.name;
  const owner = await ethers.getSigner(ownerAddr.mainnet);
  const addrs = addresses[networkName];
  const ControllerFactory = await ethers.getContractFactory("IndexController", {
    libraries: {
      PancakeswapUtilities: addrs.pancakeUtilities,
    },
  });
  logPoint();
  const indexController = await ControllerFactory.deploy(
    addrs.tokens.WBNB,
    addrs.LEV,
    addrs.SLEV,
    addrs.pancakeRouter,
    addrs.teamSharing
  );
  return indexController;
};

//deployController();
