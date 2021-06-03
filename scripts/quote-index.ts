import { Contract } from "@ethersproject/contracts";
import { deployPair } from "../test/pancakeswap";
import erc from "../artifacts/@openzeppelin/contracts/token/ERC20/IERC20.sol/IERC20.json";
import { ethers } from "hardhat";
import { expandTo18Decimals } from "../test/utils";
import poolAbi from "../artifacts/contracts/indexes/IndexPool.sol/IndexPool.json";

let pairs = {};

export const main = async () => {
  const [owner] = await ethers.getSigners();
  //    await controllerContract.deployed();
  //    const poolAddress = await controllerContract.pools(0);
  const pool = new Contract(
    "0x6976F79D727B9F36211b605d9894F7dF39EF72dd",
    poolAbi.abi,
    owner
  );

  const price = await pool.name();
  console.log(price);
};

main();
