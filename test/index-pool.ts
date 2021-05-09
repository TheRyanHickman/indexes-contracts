import {
  deployPair,
  deployPancakeExchange,
  deployPancakeUtilities,
} from "./pancakeswap";
import { expandTo18Decimals, from18Decimals, logBalanceOf } from "./utils";

import { BigNumber } from "@ethersproject/bignumber";
import { Contract } from "@ethersproject/contracts";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { computeTargetWeights } from "../scripts/calculate-weights";
import { deployLEV } from "../scripts/deploy-tokens";
import { deployMockToken } from "./token";
import { ethers } from "hardhat";
import { expect } from "chai";
import poolArtifact from "../artifacts/contracts/indexes/IndexPool.sol/IndexPool.json";

describe("Index Pool", function () {
  let owner: SignerWithAddress, devTeam: SignerWithAddress;
  let WBNB: Contract,
    mockWETH: Contract,
    mockBTC: Contract,
    mockBUSD: Contract,
    LEV: Contract,
    mock1: Contract,
    mock2: Contract,
    mock3: Contract,
    mock4: Contract,
    mock5: Contract,
    mock6: Contract,
    mock7: Contract,
    mock8: Contract,
    mock9: Contract,
    mock0: Contract,
    pancakeswapUtilities: Contract;
  let pairs: Record<string, Contract>, pancakeRouter: Contract;
  let pancakeFactory: Contract;
  let indexController: Contract;

  before(async () => {
    [owner, devTeam] = await ethers.getSigners();
    pancakeswapUtilities = (await deployPancakeUtilities()) as Contract;
    mockWETH = await deployMockToken("Test WETH", "TWETH", owner.address);
    mockBTC = await deployMockToken("Test BTC", "TBTC", owner.address);
    mockBUSD = await deployMockToken("Test BUSD", "TBUSD", owner.address);
    mock1 = await deployMockToken("test1", "T1", owner.address);
    mock2 = await deployMockToken("test1", "T2", owner.address);
    mock3 = await deployMockToken("test1", "T3", owner.address);
    mock4 = await deployMockToken("test1", "T4", owner.address);
    mock5 = await deployMockToken("test1", "T5", owner.address);
    mock6 = await deployMockToken("test1", "T6", owner.address);
    mock7 = await deployMockToken("test1", "T7", owner.address);
    mock8 = await deployMockToken("test1", "T8", owner.address);
    mock9 = await deployMockToken("test1", "T9", owner.address);
    mock0 = await deployMockToken("test1", "T0", owner.address);
    const exchange = await deployPancakeExchange(owner, {
      WETH: {
        contract: mockWETH,
        liquidity: expandTo18Decimals(5000),
      },
      BUSD: {
        contract: mockBUSD,
        liquidity: expandTo18Decimals(200),
      },
      BTC: {
        contract: mockBTC,
        liquidity: expandTo18Decimals(200),
      },
      0: {
        contract: mock0,
        liquidity: expandTo18Decimals(200),
      },
      1: {
        contract: mock1,
        liquidity: expandTo18Decimals(20000),
      },
      2: {
        contract: mock2,
        liquidity: expandTo18Decimals(200),
      },
      3: {
        contract: mock3,
        liquidity: expandTo18Decimals(200),
      },
      4: {
        contract: mock4,
        liquidity: expandTo18Decimals(200),
      },
      5: {
        contract: mock5,
        liquidity: expandTo18Decimals(1000000),
      },
      6: {
        contract: mock6,
        liquidity: expandTo18Decimals(200),
      },
      7: {
        contract: mock7,
        liquidity: expandTo18Decimals(200),
      },
      8: {
        contract: mock8,
        liquidity: expandTo18Decimals(200),
      },
      9: {
        contract: mock9,
        liquidity: expandTo18Decimals(200),
      },
    });
    pairs = exchange.pairs;
    pancakeRouter = exchange.pancakeRouter;
    pancakeFactory = exchange.pancakeFactory;
    WBNB = exchange.WBNB;
    LEV = await deployLEV(owner);
    await deployPair(
      WBNB,
      expandTo18Decimals(500),
      LEV,
      expandTo18Decimals(200),
      pancakeRouter,
      owner
    );
    await deployPair(
      mockBUSD,
      expandTo18Decimals(500),
      LEV,
      expandTo18Decimals(200),
      pancakeRouter,
      owner
    );

    const Controller = await ethers.getContractFactory("IndexController", {
      libraries: {
        PancakeswapUtilities: pancakeswapUtilities.address,
      },
    });
    indexController = await Controller.deploy(
      WBNB.address,
      mockBUSD.address,
      LEV.address,
      pancakeRouter.address,
      devTeam.address,
      devTeam.address
    );
  });

  it("Checks pairs are showing good prices", async () => {
    const reserves = await pairs.BTC.getReserves();
    const BNBIndex = (await pairs.BTC.token0()) === mockBTC.address ? 1 : 0;
    const BTCIndex = (BNBIndex + 1) % 2;
    const quote = await pancakeRouter.quote(
      expandTo18Decimals(10),
      reserves[BNBIndex],
      reserves[BTCIndex]
    );
    expect(quote).to.equal(expandTo18Decimals(10)); // 10BNB should get you 10BTC
  });

  it("Swaps BTC for BNB", async () => {
    const path = [mockBTC.address, WBNB.address];
    await mockBTC.approve(pancakeRouter.address, expandTo18Decimals(1));

    // selling 1BTC
    await pancakeRouter.swapExactTokensForTokens(
      expandTo18Decimals(1),
      0,
      path,
      owner.address,
      Date.now() + 1000
    );
    const newBalance: BigNumber = await WBNB.balanceOf(owner.address);
    expect(newBalance).to.equal(BigNumber.from("6902992054607780215625"));
  });

  it("Should buy an index", async () => {
    const pool = await deployMockIndexPool("TNDX");
    const quote = await pool.getIndexQuoteWithFee(expandTo18Decimals(1));
    const balanceBefore = await owner.getBalance();
    const tx = await pool.buyIndex(expandTo18Decimals(1), {
      value: quote,
    });
    const receipt = await tx.wait();
    const balanceAftr = await owner.getBalance();
    expect(
      balanceBefore.sub(balanceAftr).sub(calculateTxSpend(tx, receipt))
    ).to.equal(quote);
    expect(await pool.balanceOf(owner.address)).to.equal(expandTo18Decimals(1));
    const balanceETH = await mockWETH.balanceOf(pool.address);
    expect(balanceETH).to.equal(expandTo18Decimals(2).div(1000));
  });

  it("Should burn an index", async () => {
    const pool = await deployMockIndexPool("TNDX");
    const price = await pool.getIndexQuoteWithFee(expandTo18Decimals(2));
    // try to buy 2TNDX
    const balanceBNBBefore = await owner.getBalance();
    await pool.buyIndex(expandTo18Decimals(2), { value: price });

    const ourBalance = await pool.balanceOf(owner.address);
    await pool.sellIndex(ourBalance, price.mul(95).div(100));
    const ourNewBalance = await pool.balanceOf(owner.address);
    expect(ourNewBalance).to.equal(ethers.constants.Zero);
    const poolETHBalance = await mockWETH.balanceOf(pool.address);
    expect(poolETHBalance).to.equal(ethers.constants.Zero);
    expect(await mockBTC.balanceOf(pool.address)).to.equal(
      ethers.constants.Zero
    );
    const balanceBNBAfter = await owner.getBalance();
    expect(balanceBNBAfter).to.be.gt(balanceBNBBefore.mul(97).div(100));
  });

  it("Collect fees on trades", async () => {
    const pool = await deployMockIndexPool("TNDX");

    // buy index
    const price = await pool.getIndexQuoteWithFee(expandTo18Decimals(2));
    const devTeamBalanceBefore = await WBNB.balanceOf(devTeam.address);
    await pool.buyIndex(expandTo18Decimals(2), {
      value: price,
    });
    const devTeamBalanceAfter = await WBNB.balanceOf(devTeam.address);
    const mintFees = devTeamBalanceAfter.sub(devTeamBalanceBefore);
    expect(mintFees).to.equal("10183322935430");

    // burn half of what we have
    await pool.sellIndex(expandTo18Decimals(1), price.mul(48).div(100));
  });

  it("Deploys a big Index with weird weights and controller", async () => {
    const targetPriceWeights = [30, 20, 15, 5, 5, 5, 5, 5, 5, 5];
    const underlyingTokens = [
      mock0.address,
      mock1.address,
      mock2.address,
      mock3.address,
      mock4.address,
      mock5.address,
      WBNB.address,
      mock7.address,
      mock8.address,
      mock9.address,
    ];
    const computedWeights = await computeTargetWeights(
      underlyingTokens,
      targetPriceWeights,
      pancakeRouter,
      WBNB.address,
      mockBUSD.address
    );
    const ctr = await indexController.createIndexPool(
      "LegacyIndex",
      "LI",
      underlyingTokens,
      computedWeights,
      [0],
      {
        gasLimit: 5000000,
      }
    );
    const receipt = await ctr.wait();
    const poolAddr = receipt.events[3].args.index;
    const poolContract = new ethers.Contract(poolAddr, poolArtifact.abi, owner);
    const quote = await poolContract.getIndexQuoteWithFee(
      expandTo18Decimals(1).div(100)
    );
    await poolContract.buyIndex(expandTo18Decimals(1).div(100), {
      value: quote.mul(102).div(100),
    });
    expect(await poolContract.balanceOf(owner.address)).to.equal(
      expandTo18Decimals(1).div(100)
    );
  });

  it("Buys index with Fake BUSD", async () => {
    const pool = await deployMockIndexPool("TNDX");

    // buy index
    const price = await pool.getIndexQuoteWithFee(expandTo18Decimals(2));
    const quoteForBUSD = await pool.getTokenQuote(
      mockBUSD.address,
      expandTo18Decimals(1)
    );
    const priceUSD = expandTo18Decimals(price).div(quoteForBUSD);
    await mockBUSD.approve(pool.address, priceUSD.mul(110).div(100));
    await pool.buyIndexWith(
      expandTo18Decimals(2),
      mockBUSD.address,
      priceUSD.mul(110).div(100)
    );
    expect(await pool.balanceOf(owner.address)).to.equal(expandTo18Decimals(2));
  });

  it("Rebalances an index with new weights", async () => {
    const pool = await deployMockIndexPool("TNDX", [10, 11, 8]);
    const quote = await pool.getIndexQuoteWithFee(expandTo18Decimals(11));
    await buyIndex(pool, 11);
    return; // TODO
    await pool.changeWeights([9, 7, 18]);
    const poolWBNBBalance = await WBNB.balanceOf(pool.address);
    await pool.sellIndex(
      expandTo18Decimals(10),
      quote.sub(poolWBNBBalance).mul(96).div(100)
    );
  });

  it("Withdraw tokens using the emergencyWithdraw function", async () => {
    const pool = await deployMockIndexPool("TEST", [3, 5, 6]);
    const balanceETHBefore = await mockWETH.balanceOf(owner.address);
    await buyIndex(pool, 4);
    await pool.emergencyWithdraw();
    expect(
      (await mockWETH.balanceOf(owner.address)).sub(balanceETHBefore)
    ).to.eq(BigNumber.from("12000000000000000"));
    expect(await pool.balanceOf(owner.address)).to.eq(BigNumber.from(0));
    await buyIndex(pool, 3, devTeam);
    await buyIndex(pool, 2);
    await pool.connect(devTeam).emergencyWithdraw();
    expect(await mockWETH.balanceOf(pool.address)).to.eq(
      BigNumber.from("6000000000000000")
    );
    await pool.emergencyWithdraw();
    expect(await pool.balanceOf(devTeam.address)).to.eq(BigNumber.from(0));
  });

  const buyIndex = async (index: Contract, amount: number, user = owner) => {
    const quote = await index.getIndexQuoteWithFee(expandTo18Decimals(11));
    return index.connect(user).buyIndex(expandTo18Decimals(amount), {
      value: quote,
    });
  };

  const deployMockIndexPool = async (symbol: string, weights = [2, 1, 3]) => {
    pancakeswapUtilities = (await deployPancakeUtilities()) as Contract;
    const tx = await indexController.createIndexPool(
      "hello world pool",
      symbol,
      [mockWETH.address, mockBTC.address, WBNB.address],
      weights,
      [0]
    );
    const receipt = await tx.wait();
    const poolAddr = receipt.events[3].args.index;
    return new ethers.Contract(poolAddr, poolArtifact.abi, owner);
  };

  const calculateTxSpend = (tx: any, receipt: any) =>
    receipt.gasUsed.mul(tx.gasPrice);
});
