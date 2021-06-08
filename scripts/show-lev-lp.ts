import { ethers } from "hardhat";
import { network } from "hardhat";

const main = async () => {
  const env = network.name;
  const addresses = require(`../addresses-${env}.json`);
  const pair = await ethers.getContractAt(
    "IUniswapV2Pair",
    "0x27A4B45E2710fFA309A5aF968a264C60994D5608"
  );
  const reserves = await pair.getReserves();
  console.log(reserves[0].toString(), reserves[1].toString());
};

main();
