import {
  deployPair,
  deployPancakeExchange,
  deployPancakeUtilities,
} from "./pancakeswap";

import { BigNumber } from "@ethersproject/bignumber";
import { Contract } from "@ethersproject/contracts";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Wallet } from "@ethersproject/wallet";
import { deployLEV } from "../scripts/deploy-tokens";
import { deployMockToken } from "./token";
import { ethers } from "hardhat";
import { expandTo18Decimals } from "./utils";
import { expect } from "chai";
import poolAbi from "../artifacts/contracts/indexes/IndexPool.sol/IndexPool.json";

describe("Pool Controller", function () {
  let owner: SignerWithAddress, devTeam: SignerWithAddress;
  let LEV: Contract,
    mockWETH: Contract,
    mockSLEV: Contract,
    mockBUSD: Contract,
    mockBTC: Contract,
    mockLEV: Contract,
    WBNB: Contract,
    pancakeRouter: Contract;

  before(async () => {
    [owner] = await ethers.getSigners();
    const pancakeswapUtilities = (await deployPancakeUtilities()) as Contract;
    mockSLEV = await deployMockToken("Fake SLEV", "VELS", owner.address);
    mockBUSD = await deployMockToken("Fake BUSD", "DSUB", owner.address);
    mockBTC = await deployMockToken("Fake BTC", "CTB", owner.address);
    mockWETH = await deployMockToken("Fake WETH", "HTEW", owner.address);
    const exchange = await deployPancakeExchange(owner, {
      WETH: {
        contract: mockWETH,
        liquidity: expandTo18Decimals(5000),
      },
      BTC: {
        contract: mockBTC,
        liquidity: expandTo18Decimals(200),
      },
    });
    pancakeRouter = exchange.pancakeRouter;
    WBNB = exchange.WBNB;
    LEV = await deployLEV(
      pancakeswapUtilities.address,
      owner.address,
      pancakeRouter.address,
      mockSLEV.address,
      owner.address
    );
    await deployPair(
      WBNB,
      expandTo18Decimals(500),
      LEV,
      expandTo18Decimals(200),
      pancakeRouter,
      owner
    );
    await deployPair(
      LEV,
      expandTo18Decimals(500),
      mockSLEV,
      expandTo18Decimals(200),
      pancakeRouter,
      owner
    );
  });

  it("Instantiates an Index Pool", async () => {
    const pancakeswapUtilities = (await deployPancakeUtilities()) as Contract;
    const Controller = await ethers.getContractFactory("IndexController", {
      libraries: {
        PancakeswapUtilities: pancakeswapUtilities.address,
      },
    });
    const controllerContract = await Controller.deploy(
      WBNB.address,
      LEV.address,
      mockSLEV.address,
      pancakeRouter.address,
      owner.address
    );
    await controllerContract.createIndexPool(
      "Test INDX",
      "TNDX",
      [mockBTC.address, mockWETH.address, WBNB.address],
      [30, 220, 99],
      [0]
    );
    await controllerContract.deployed();
    const poolAddress = await controllerContract.pools(0);
    const pool = new Contract(poolAddress, poolAbi.abi, owner);

    const price = await pool.getIndexQuote(expandTo18Decimals(1));
    expect(price).to.equal(BigNumber.from("196304132126727219"));
    const priceWFee = await pool.getIndexQuoteWithFee(expandTo18Decimals(1));
    await pool.buyIndex(expandTo18Decimals(1), {
      value: priceWFee,
    });
  });
});
