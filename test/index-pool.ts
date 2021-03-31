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
  let mockBUSD: Contract,
    mockWETH: Contract,
    mockBTC: Contract,
    pancakeswapUtilities: Contract;
  let pairs: Record<string, Contract>, pancakeRouter: Contract;
  let pancakeFactory: Contract;

  before(async () => {
    [owner, devTeam] = await ethers.getSigners();
    pancakeswapUtilities = await deployPancakeUtilities();
    mockBUSD = await deployMockToken("Test BUSD", "TBUSD", owner.address);
    mockWETH = await deployMockToken("Test WETH", "TWETH", owner.address);
    mockBTC = await deployMockToken("Test BTC", "TBTC", owner.address);
    const exchange = await deployPancakeExchange(owner, mockBUSD, mockWETH, {
      WETH: {
        contract: mockWETH,
        liquidity: expandTo18Decimals(5000),
      },
      BTC: {
        contract: mockBTC,
        liquidity: expandTo18Decimals(200),
      },
    });
    pairs = exchange.pairs;
    pancakeRouter = exchange.pancakeRouter;
    pancakeFactory = exchange.pancakeFactory;
  });

  it("Checks pairs are showing good prices", async () => {
    const reserves = await pairs.BTC.getReserves();
    const USDIndex = (await pairs.BTC.token0()) === mockBTC.address ? 1 : 0;
    const BTCIndex = (USDIndex + 1) % 2;
    const quote = await pancakeRouter.quote(
      expandTo18Decimals(1000000),
      reserves[USDIndex],
      reserves[BTCIndex]
    );
    expect(quote).to.equal(expandTo18Decimals(20)); // $1M should get you 20BTC
  });

  it("Swaps BTC for BUSD", async () => {
    const path = [mockBTC.address, mockBUSD.address];
    await mockBTC.approve(pancakeRouter.address, expandTo18Decimals(1));

    // selling 1BTC
    await pancakeRouter.swapExactTokensForTokens(
      expandTo18Decimals(1),
      0,
      path,
      owner.address,
      Date.now() + 1000
    );
    const newBalance: BigNumber = await mockBUSD.balanceOf(owner.address);
    expect(newBalance).to.equal(BigNumber.from("80049602730389010781255441"));
  });

  it("Should buy an index", async () => {
    const pool = await deployMockIndexPool("TNDX");
    const quote = await pool.getIndexQuoteWithFee(expandTo18Decimals(1));
    await mockBUSD.approve(pool.address, quote);
    const balanceBefore = await mockBUSD.balanceOf(owner.address);
    await pool.buyExactIndexAmount(expandTo18Decimals(1), quote);
    const balanceAftr = await mockBUSD.balanceOf(owner.address);

    expect(balanceBefore.sub(balanceAftr)).to.equal(quote);
    expect(await pool.balanceOf(owner.address)).to.equal(expandTo18Decimals(1));
    const balanceETH = await mockWETH.balanceOf(pool.address);
    expect(balanceETH).to.equal(expandTo18Decimals(2).div(1000));
  });

  it("Should burn an index", async () => {
    const pool = await deployMockIndexPool("TNDX");
    const price = await pool.getIndexQuoteWithFee(expandTo18Decimals(2));
    // try to buy 2TNDX
    await mockBUSD.approve(pool.address, price);
    await pool.buyExactIndexAmount(expandTo18Decimals(2), price);

    const ourBalance = await pool.balanceOf(owner.address);
    await pool.sellIndex(ourBalance, price.mul(95).div(100));
    const ourNewBalance = await pool.balanceOf(owner.address);
    expect(ourNewBalance).to.equal(ethers.constants.Zero);
    const poolETHBalance = await mockWETH.balanceOf(pool.address);
    expect(poolETHBalance).to.equal(ethers.constants.Zero);
    expect(await mockBTC.balanceOf(pool.address)).to.equal(
      ethers.constants.Zero
    );
    // TODO: check USD balance
  });

  it("Collect fees on trades", async () => {
    const pool = await deployMockIndexPool("TNDX");

    const emptyDevAccount = async () => {
      const devTeamBalance = await mockBUSD.balanceOf(devTeam.address);
      return mockBUSD.connect(devTeam).transfer(owner.address, devTeamBalance);
    };
    // empty dev team balance
    await emptyDevAccount();
    expect(await mockBUSD.balanceOf(devTeam.address)).to.equal(
      ethers.constants.Zero
    );

    // buy index
    const price = await pool.getIndexQuoteWithFee(expandTo18Decimals(2));
    await mockBUSD.approve(pool.address, price);
    const devTeamBalanceBefore = await mockBUSD.balanceOf(devTeam.address);
    const priceWOFee = await pool.getIndexQuote(expandTo18Decimals(2));
    await pool.buyExactIndexAmount(expandTo18Decimals(2), price);
    const devTeamBalanceAfter = await mockBUSD.balanceOf(devTeam.address);
    const mintFees = devTeamBalanceAfter.sub(devTeamBalanceBefore);
    expect(mintFees).to.equal(priceWOFee.div(100));

    // burn half of what we have
    await pool.sellIndex(expandTo18Decimals(1), price.mul(48).div(100));
  });

  const deployMockIndexPool = async (symbol: string) => {
    pancakeswapUtilities = await deployPancakeUtilities();
    const IndexPool = await ethers.getContractFactory("IndexPool", {
      libraries: {
        PancakeswapUtilities: pancakeswapUtilities.address,
      },
    });
    const pool = await IndexPool.deploy(
      "hello world pool",
      symbol,
      [mockWETH.address, mockBTC.address],
      [2, 1],
      mockBUSD.address,
      pancakeRouter.address,
      devTeam.address,
      [0]
    );
    await pool.deployed();
    return pool;
  };
});
