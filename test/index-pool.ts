import { deployPancakeExchange, deployPancakeUtilities } from "./pancakeswap";
import { expandTo18Decimals, from18Decimals, logBalanceOf } from "./utils";

import { BigNumber } from "@ethersproject/bignumber";
import { Contract } from "@ethersproject/contracts";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { deployMockToken } from "./token";
import { ethers } from "hardhat";
import { expect } from "chai";

describe("Index Pool", function () {
  let owner: SignerWithAddress, devTeam: SignerWithAddress;
  let mockBNB: Contract,
    mockWETH: Contract,
    mockBTC: Contract,
    mockBUSD: Contract,
    pancakeswapUtilities: Contract;
  let pairs: Record<string, Contract>, pancakeRouter: Contract;
  let pancakeFactory: Contract;

  before(async () => {
    [owner, devTeam] = await ethers.getSigners();
    pancakeswapUtilities = (await deployPancakeUtilities()) as Contract;
    mockWETH = await deployMockToken("Test WETH", "TWETH", owner.address);
    mockBTC = await deployMockToken("Test BTC", "TBTC", owner.address);
    mockBUSD = await deployMockToken("Test BUSD", "TBUSD", owner.address);
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
    });
    pairs = exchange.pairs;
    pancakeRouter = exchange.pancakeRouter;
    pancakeFactory = exchange.pancakeFactory;
    mockBNB = exchange.WBNB;
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
    expect(quote).to.equal(expandTo18Decimals(4)); // 10BNB should get you 4BTC
  });

  it("Swaps BTC for BNB", async () => {
    const path = [mockBTC.address, mockBNB.address];
    await mockBTC.approve(pancakeRouter.address, expandTo18Decimals(1));

    // selling 1BTC
    await pancakeRouter.swapExactTokensForTokens(
      expandTo18Decimals(1),
      0,
      path,
      owner.address,
      Date.now() + 1000
    );
    const newBalance: BigNumber = await mockBNB.balanceOf(owner.address);
    expect(newBalance).to.equal(BigNumber.from("102480136519450539062"));
  });

  it("Should buy an index", async () => {
    const pool = await deployMockIndexPool("TNDX");
    const quote = await pool.getIndexQuoteWithFee(expandTo18Decimals(1));
    const balanceBefore = await owner.getBalance();
    const tx = await pool.buyExactIndexAmount(expandTo18Decimals(1), {
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
    await pool.buyExactIndexAmount(expandTo18Decimals(2), { value: price });

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
    const devTeamBalanceBefore = await mockBNB.balanceOf(devTeam.address);
    const priceWOFee = await pool.getIndexQuote(expandTo18Decimals(2));
    await pool.buyExactIndexAmount(expandTo18Decimals(2), {
      value: price,
    });
    const devTeamBalanceAfter = await mockBNB.balanceOf(devTeam.address);
    const mintFees = devTeamBalanceAfter.sub(devTeamBalanceBefore);
    expect(mintFees).to.equal(priceWOFee.div(100));

    // burn half of what we have
    await pool.sellIndex(expandTo18Decimals(1), price.mul(48).div(100));
  });

  it("Deploys a big Index", async () => {
    const IndexPool = await ethers.getContractFactory("IndexPool", {
      libraries: {
        PancakeswapUtilities: pancakeswapUtilities.address,
      },
    });
    const ctr = await IndexPool.deploy(
      "LegacyIndex",
      "LI",
      [
        "0xae13d989dac2f0debff460ac112a837c89baa7cd",
        "0xae13d989dac2f0debff460ac112a837c89baa7cd",
        "0xae13d989dac2f0debff460ac112a837c89baa7cd",
        "0xae13d989dac2f0debff460ac112a837c89baa7cd",
        "0xae13d989dac2f0debff460ac112a837c89baa7cd",
        "0xae13d989dac2f0debff460ac112a837c89baa7cd",
        "0xae13d989dac2f0debff460ac112a837c89baa7cd",
        "0xae13d989dac2f0debff460ac112a837c89baa7cd",
        "0xae13d989dac2f0debff460ac112a837c89baa7cd",
        "0xae13d989dac2f0debff460ac112a837c89baa7cd",
      ],
      [30, 20, 15, 5, 5, 5, 5, 5, 5, 5],
      mockBNB.address,
      pancakeRouter.address,
      devTeam.address,
      [0],
      {
        gasLimit: 5000000,
      }
    );
    await ctr.deployed();
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
    pool.buyExactIndexForToken(
      expandTo18Decimals(2),
      mockBUSD.address,
      priceUSD.mul(110).div(100)
    );
    expect(await pool.balanceOf(owner.address)).to.equal(expandTo18Decimals(2));
  });

  const deployMockIndexPool = async (symbol: string) => {
    pancakeswapUtilities = (await deployPancakeUtilities()) as Contract;
    const IndexPool = await ethers.getContractFactory("IndexPool", {
      libraries: {
        PancakeswapUtilities: pancakeswapUtilities.address,
      },
    });
    const pool = await IndexPool.deploy(
      "hello world pool",
      symbol,
      [mockWETH.address, mockBTC.address, mockBNB.address],
      [2, 1, 3],
      mockBNB.address,
      pancakeRouter.address,
      devTeam.address,
      [0]
    );
    await pool.deployed();
    return pool;
  };

  const calculateTxSpend = (tx: any, receipt: any) =>
    receipt.gasUsed.mul(tx.gasPrice);
});
