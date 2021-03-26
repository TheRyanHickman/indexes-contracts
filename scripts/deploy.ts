import { Contract, ContractFactory } from "@ethersproject/contracts";
import { deployLEV, deploySLEV } from "./deploy-tokens";
import {
  deployPancakeExchange,
  deployPancakeUtilities,
} from "../test/pancakeswap";
import hre, { ethers } from "hardhat";

import { deployMockToken } from "../test/token";
import { deployStakingPool } from "./deploy-staking";
import { expandTo18Decimals } from "../test/utils";

let addresses: ContractAddresses = {
  testnet: {
    pancakeRouter: "0xD99D1c33F9fC3444f8101754aBC46c52416550D1",
    pancakeFactory: "0x6725F303b657a9451d8BA641348b6761A6CC7a17",
    tokens: {
      BTCB: "0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c",
      WETH: "0x8d0e18c97e5Dd8Ee2B539ae8cD3a3654DF5d79E5",
      BUSD: "0x8301F2213c0eeD49a7E28Ae4c3e91722919B8B47",
      WBNB: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
    },
  },
};

const main = async () => {
  const owner = await ethers.getSigner(
    "0xa5Caf1729c2628A3f04a60f7299f86148D1687f7"
  );
  const network = hre.network.name;

  // if deploying locally, we need to locally deploy pancakeswap and tokens
  if (network === "hardhat" || network === "localhost") {
    const mockBUSD = await deployMockToken("Fake BUSD", "DSUB", owner.address);
    const mockWETH = await deployMockToken("Fake WETH", "HTEW", owner.address);
    const exchange = await deployPancakeExchange(owner, mockBUSD, mockWETH, {});
    addresses[network] = {
      pancakeRouter: exchange.pancakeRouter.address,
      pancakeFactory: exchange.pancakeFactory.address,
      tokens: {
        BUSD: mockBUSD.address,
        BTCB: (await deployMockToken("Fake BTC", "CTB", owner.address)).address,
        WETH: mockWETH.address,
        WBNB: (await deployMockToken("Fake WBNB", "BNBW", owner.address))
          .address,
      },
    };
  }

  console.log(`Deploying all contracts to ${network} by ${owner.address}...`);
  const utilities = await deployPancakeUtilities();
  logPoint();

  const addrs = addresses[network];
  const teamSharing = await deployTeamSharing(owner.address);
  const slev = await deploySLEV(owner.address);
  logPoint();
  const lev = await deployLEV(
    utilities.address,
    owner.address,
    addrs.pancakeRouter,
    slev.address,
    teamSharing.address
  );
  logPoint();
  const ControllerFactory = await ethers.getContractFactory("IndexController", {
    libraries: {
      PancakeswapUtilities: utilities.address,
    },
  });
  logPoint();
  const indexController = await ControllerFactory.deploy(
    addrs.tokens.BUSD,
    lev.address,
    slev.address,
    addrs.pancakeRouter,
    owner.address
  );
  logPoint();
  const indexInstanceAddress = await deployTestIndex(indexController);
  logPoint();
  const stakingPool = await deployStakingPool(
    utilities.address,
    slev.address,
    lev.address,
    addrs.pancakeRouter
  );
  console.log("\nContracts deployed", {
    utilities: utilities.address,
    slev: slev.address,
    lev: lev.address,
    indexController: indexController.address,
    indexInstance: indexInstanceAddress,
    tokenSharing: teamSharing.address,
    stakingPool: stakingPool,
  });
};

const deployTestIndex = async (indexController: Contract) => {
  const tokensAddrs = addresses["testnet"].tokens;
  await indexController.deployed();
  const tx = await indexController.createIndexPool(
    "Legacy Index",
    "LI",
    [tokensAddrs.BTCB, tokensAddrs.WETH, tokensAddrs.WBNB],
    [30, 20, 15],
    [0]
  );
  await tx.wait();
  return await indexController.pools(0);
};

const deployTeamSharing = async (owner: string) => {
  const TokenSharingFactory = await ethers.getContractFactory("TokenSharing");
  const tokenSharing = await TokenSharingFactory.deploy(owner, []);
  return tokenSharing.deployed();
};

const logPoint = () => {
  process.stdout.write(".");
};

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

type ContractAddresses = Record<
  string,
  {
    pancakeRouter: string;
    pancakeFactory: string;
    tokens: {
      BTCB: string;
      WETH: string;
      BUSD: string;
      WBNB: string;
    };
  }
>;
