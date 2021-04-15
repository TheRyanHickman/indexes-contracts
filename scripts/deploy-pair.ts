import { deployPair } from "../test/pancakeswap";
import erc from "../artifacts/@openzeppelin/contracts/token/ERC20/IERC20.sol/IERC20.json";
import { ethers } from "hardhat";
import { expandTo18Decimals } from "../test/utils";
import router from "../artifacts/@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol/IUniswapV2Router02.json";

let pairs = {};

export const deployPairWithPresets = async (
  tokA: string,
  tokB: string,
  routerAddr: string
) => {
  const [signer] = await ethers.getSigners();
  const tokenA = new ethers.Contract(tokA, erc.abi, signer);
  const tokenB = new ethers.Contract(tokB, erc.abi, signer);
  const routerContract = new ethers.Contract(routerAddr, router.abi, signer);
  const pair = await deployPair(
    tokenA,
    expandTo18Decimals(1000),
    tokenB,
    expandTo18Decimals(1000),
    routerContract,
    signer
  );
  console.log("Pair deployed");
  return pair.address;
};

//deployPairWithPresets(
//  "0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c",
//  "0x8301F2213c0eeD49a7E28Ae4c3e91722919B8B47",
//  "0xD99D1c33F9fC3444f8101754aBC46c52416550D1"
//);
