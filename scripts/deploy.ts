import { Contract, ContractFactory } from "@ethersproject/contracts";
import { deployLEV, deploySLEV } from "./deploy-tokens";
import {
  deployPair,
  deployPancakeExchange,
  deployPancakeUtilities,
} from "../test/pancakeswap";
import hre, { ethers } from "hardhat";

import { BigNumber } from "@ethersproject/bignumber";
import { deployMockToken } from "../test/token";
import { deployStakingPool } from "./deploy-staking";
import { expandTo18Decimals } from "../test/utils";
import fs from "fs";

const MAINNET = "mainnet";
export const deployConfig = {
  //                     5,000,000,000
  //  gasPrice: BigNumber.from("5000000000"),
};

export let addresses: ContractAddresses = {
  testnet: {
    pancakeRouter: "0xD99D1c33F9fC3444f8101754aBC46c52416550D1",
    pancakeUtilities: "",
    teamSharing: "",
    indexController: "",
    LEV: "",
    SLEV: "",
    tokens: {
      BTCB: "0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c",
      WETH: "0x8d0e18c97e5Dd8Ee2B539ae8cD3a3654DF5d79E5",
      BUSD: "0x8301F2213c0eeD49a7E28Ae4c3e91722919B8B47",
      WBNB: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
      levbnblp: "TODO",
      levbusdlp: "TODO",
    },
  },
  ropsten: {
    pancakeRouter: "0xBdd90d799347C06dB6ad43Bd46d843c88945Ba52",
    pancakeUtilities: "0x9676289a62Dd0e9d25f632ebd9626170BD2b805B",
    teamSharing: "",
    LEV: "0x4E6bA3a22cE39cBBdE41B8A83c3292317A9641fA",
    SLEV: "0x81277E153E95Ff88Be91A4Bce583e28c3C4e1609",
    indexController: "0xF101e983607c85bFaC2Ad80471EA09e3B56FB212",
    tokens: {
      BTCB: "0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c",
      WETH: "0x8d0e18c97e5Dd8Ee2B539ae8cD3a3654DF5d79E5",
      BUSD: "0x16c550a97ad2ae12c0c8cf1cc3f8db4e0c45238f",
      WBNB: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
      levbnblp: "TODO",
      levbusdlp: "TODO",
    },
  },
  mainnet: {
    pancakeUtilities: "0x4F653eCe3313513f4F5aE2E1A13D134899fE607d",
    teamSharing: "0x4812B2599bdB0aCDB9caf1a90C9084c69E5DbE5D",
    pancakeRouter: "0x05fF2B0DB69458A0750badebc4f9e13aDd608C7F",
    SLEV: "0x88DC5a935C8D0a4c5D044f538C70E22E85bDA205",
    LEV: "0x49dB132a09381BC26709bab0D7300BEA764b30e1",
    indexController: "0x4035A1218B28eC5F7723D67075786C3B95C5e1F6",
    tokens: {
      BTCB: "",
      WETH: "",
      BUSD: "0xe9e7cea3dedca5984780bafc599bd69add087d56",
      WBNB: "",
      levbnblp: "",
      levbusdlp: "",
    },
  },
};

export const ownerAddr = {
  localhost: "0x8626f6940e2eb28930efb4cef49b2d1f2c9c1199",
  ropsten: "0xa5Caf1729c2628A3f04a60f7299f86148D1687f7",
  testnet: "",
  hardhat: "",
  mainnet: "0x6DeBA0F8aB4891632fB8d381B27eceC7f7743A14",
};

export const dontRedeploy = (name: keyof typeof addresses.mainnet) => {
  if (hre.network.name === MAINNET && addresses.mainnet[name]) {
    console.log("Not redeploying ", name);
    return true;
  }
  return false;
};

const main = async () => {
  const network: "localhost" | "ropsten" | "hardhat" | "testnet" = hre.network
    .name as any;
  const owner = await ethers.getSigner(ownerAddr[network]);
  let mockBUSD: Contract | undefined = undefined;
  let router: Contract | undefined = undefined;

  // if deploying locally, we need to locally deploy pancakeswap and tokens
  if (
    network === "hardhat" ||
    network === "localhost" ||
    network === "ropsten"
  ) {
    mockBUSD = await deployMockToken("Fake BUSD", "DSUB", owner.address);
    const mockWETH = await deployMockToken("Fake WETH", "HTEW", owner.address);
    const mockBTC = await deployMockToken("Fake BTC", "BTCF", owner.address);
    const mockBNB = await deployMockToken("Fake BNB", "BNBF", owner.address);
    const mockLevbnblp = await deployMockToken(
      "Fake LEVBNBLP",
      "FLEVBNBLP",
      owner.address
    );
    const mockLevbusdlp = await deployMockToken(
      "Fake LEVBUSDLP",
      "FLEVBUSDLP",
      owner.address
    );
    const exchange = await deployPancakeExchange(owner, {
      BTC: {
        contract: mockBTC,
        liquidity: expandTo18Decimals(10000),
      },
      BNB: {
        contract: mockBNB,
        liquidity: expandTo18Decimals(10000),
      },
      WETH: {
        contract: mockWETH,
        liquidity: expandTo18Decimals(10000),
      },
    });
    router = exchange.pancakeRouter;
    addresses[network] = {
      pancakeRouter: exchange.pancakeRouter.address,
      pancakeUtilities: "",
      teamSharing: "",
      LEV: "",
      SLEV: "",
      indexController: "",
      tokens: {
        BUSD: mockBUSD?.address as string,
        BTCB: mockBTC.address,
        WETH: mockWETH.address,
        WBNB: mockBNB.address,
        levbnblp: mockLevbnblp.address,
        levbusdlp: mockLevbusdlp.address,
      },
    };
  } else {
    //throw new Error("TODO: create router contract from address");
  }

  console.log(`Deploying all contracts to ${network} by ${owner.address}...`);
  const utilities = await deployPancakeUtilities();
  logPoint();

  const addrs = addresses[network];
  const teamSharing = await deployTeamSharing(owner.address);
  const slev = (await deploySLEV(owner.address)) as Contract;
  logPoint();
  const lev = (await deployLEV(
    utilities?.address || addrs.pancakeUtilities,
    owner.address,
    addrs.pancakeRouter,
    addrs.SLEV || slev.address,
    teamSharing?.address || addrs.teamSharing
  )) as Contract;
  logPoint();
  const ControllerFactory = await ethers.getContractFactory("IndexController", {
    libraries: {
      PancakeswapUtilities: utilities?.address || addrs.pancakeUtilities,
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
  await deployPair(
    lev,
    expandTo18Decimals(1000),
    slev,
    expandTo18Decimals(1000),
    router as Contract,
    owner
  );
  logPoint();
  const stakingPoolLEV = await deployStakingPool(
    utilities?.address || addrs.pancakeUtilities,
    slev.address,
    lev.address,
    [lev.address],
    addrs.pancakeRouter
  );
  const stakingPoolLEVBUSDLP = await deployStakingPool(
    utilities?.address || addrs.pancakeUtilities,
    slev.address,
    addrs.tokens.levbusdlp,
    [lev.address],
    addrs.pancakeRouter
  );
  const stakingPoolLEVBNBDLP = await deployStakingPool(
    utilities?.address || addrs.pancakeUtilities,
    slev.address,
    addrs.tokens.levbnblp,
    [lev.address],
    addrs.pancakeRouter
  );
  await slev.connect(owner).setMinter(stakingPoolLEV);
  const deployed = {
    utilities: utilities?.address || addrs.pancakeUtilities,
    slev: slev.address,
    lev: lev.address,
    busd: mockBUSD?.address as string,
    indexController: indexController.address,
    indexInstance: indexInstanceAddress,
    tokenSharing: teamSharing?.address || addrs.pancakeUtilities,
    stakingPoolLEV: stakingPoolLEV,
    stakingPoolLEVBUSDLP,
    stakingPoolLEVBNBDLP,
    router: addrs.pancakeRouter,
  };
  console.log(deployed);
  fs.writeFileSync(
    "./deployed-contracts.json",
    JSON.stringify(deployed, null, 2)
  );
};

const deployTestIndex = async (indexController: Contract) => {
  const network = hre.network.name;
  const tokensAddrs = addresses[network].tokens;
  console.log("Will deploy controller");
  await indexController.deployed();
  console.log("controller deployed");
  const tx = await indexController.createIndexPool(
    "Legacy Index",
    "LI",
    [tokensAddrs.BTCB, tokensAddrs.WETH, tokensAddrs.WBNB],
    [30, 20, 15],
    [0]
  );
  const receipt = await tx.wait();
  console.error("underlying tokens are", [
    tokensAddrs.BTCB,
    tokensAddrs.WETH,
    tokensAddrs.WBNB,
  ]);
  return await indexController.pools(0);
};

const deployTeamSharing = async (owner: string) => {
  if (dontRedeploy("teamSharing")) return;
  const TokenSharingFactory = await ethers.getContractFactory("TokenSharing");
  const tokenSharing = await TokenSharingFactory.deploy(
    owner,
    [],
    deployConfig
  );
  return tokenSharing.deployed();
};

const logPoint = () => {
  process.stdout.write(".");
};

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
if (true)
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
    pancakeUtilities: string;
    teamSharing: string;
    LEV: string;
    SLEV: string;
    indexController: string;
    tokens: {
      BTCB: string;
      WETH: string;
      BUSD: string;
      WBNB: string;
      levbusdlp: string;
      levbnblp: string;
    };
  }
>;
