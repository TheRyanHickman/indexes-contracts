import { addresses } from "./deploy";
import { ethers } from "hardhat";

export const deployController = async () => {
  const networkName = "mainnet";
  const [owner] = await ethers.getSigners();
  const addrs = addresses[networkName];
  const ControllerFactory = await ethers.getContractFactory("IndexController", {
    libraries: {
      PancakeswapUtilities: addrs.pancakeUtilities,
    },
  });
  const indexController = await ControllerFactory.deploy(
    addrs.tokens.WBNB,
    addrs.LEV,
    addrs.SLEV,
    addrs.pancakeRouter,
    addrs.teamSharing
  );
  console.log("CONTROLLER:", indexController.address);
  return indexController;
};

//deployController();
