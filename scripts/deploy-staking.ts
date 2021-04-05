import { deployPair, getPancakeRouter } from "../test/pancakeswap";

import ERC20Artifact from "../artifacts/contracts/tokens/LEVToken.sol/LEVToken.json";
import { addresses } from "./deploy";
import { deployPairWithPresets } from "./deploy-pair";
import { ethers } from "hardhat";
import { expandTo18Decimals } from "../test/utils";

export const getStakingPoolFactory = (putilities: string) => {
  return ethers.getContractFactory("LEVStackingPool", {
    libraries: {
      PancakeswapUtilities: putilities,
    },
  });
};

export const deployStakingPool = async (
  pancakeswapUtilities: string,
  SLEV: string,
  pair: string,
  stakeToken: string,
  rewardTokens: string[],
  router: string
) => {
  const stakingFactory = await getStakingPoolFactory(pancakeswapUtilities);
  const stakingPool = await stakingFactory.deploy(
    SLEV,
    stakeToken,
    pair,
    rewardTokens,
    rewardTokens.map((_) => expandTo18Decimals(1)),
    router
  );
  return stakingPool.address;
};

const ERC20 = async (addr: string) => {
  const [signer] = await ethers.getSigners();
  return new ethers.Contract(addr, ERC20Artifact.abi, signer);
};

const main = async () => {
  const [signer] = await ethers.getSigners();
  const addrs = addresses.mainnet;
  const router = await getPancakeRouter(addrs.pancakeRouter);
  //console.log(
  //  "our balance LEV",
  //  (await ERC20(addrs.LEV)).balanceOf(signer.address)
  //);

  // const levslevlp = await deployPair(
  //   await ERC20(addrs.LEV),
  //   expandTo18Decimals(1000),
  //   await ERC20(addrs.SLEV),
  //   expandTo18Decimals(1000),
  //   router,
  //   signer
  // );
  //  const levslevlp = await router.getPair(addrs.LEV, addrs.SLEV);
  //  console.log(levslevlp);
  const stakingPoolLEV = await deployStakingPool(
    addrs.pancakeUtilities,
    addrs.SLEV,
    ethers.constants.AddressZero,
    addrs.LEV,
    [addrs.LEV, addrs.tokens.BUSD],
    addrs.pancakeRouter
  );
  //const stakingPoolLEVBUSDLP = await deployStakingPool(
  //  addrs.pancakeUtilities,
  //  addrs.SLEV,
  //  addrs.tokens.levbusdlp,
  //  addrs.tokens.levbusdlp,
  //  [addrs.LEV],
  //  addrs.pancakeRouter
  //);
  //const stakingPoolLEVBNBDLP = await deployStakingPool(
  //  addrs.pancakeUtilities,
  //  addrs.SLEV,
  //  addrs.tokens.levbnblp,
  //  addrs.tokens.levbnblp,
  //  [addrs.LEV],
  //  addrs.pancakeRouter
  //);
  console.log({
    stakingPoolLEV,
    //  stakingPoolLEVBUSDLP,
    //  stakingPoolLEVBNBDLP,
  });
};

//main();
const deployBUSDLEVPool = async () => {
  const addrs = addresses.mainnet;
  // await deployPairWithPresets(
  //   addrs.LEV,
  //   addrs.tokens.BUSD,
  //   addrs.pancakeRouter
  // );
  //  await deployPairWithPresets(
  //    addrs.LEV,
  //    addrs.tokens.BUSD,
  //    addrs.pancakeRouter
  //  );
};

//deployBUSDLEVPool();
