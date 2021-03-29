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
    const price = await pool.getPoolPriceBUSD();
    const willingToPay = price.mul(102).div(100);
    await mockBUSD.approve(pool.address, willingToPay);
    await pool.mint(expandTo18Decimals(1), willingToPay);

    expect(await pool.balanceOf(owner.address)).to.equal(expandTo18Decimals(1));
    const balanceETH = await mockWETH.balanceOf(pool.address);
    expect(balanceETH).to.equal(expandTo18Decimals(2).div(1000));
  });

  it("Should burn an index", async () => {
    const pool = await deployMockIndexPool("TNDX");
    const price = await pool.getPoolPriceBUSD();
    // try to buy 2TNDX
    await mockBUSD.approve(pool.address, price.mul(3));
    await pool.mint(expandTo18Decimals(2), price.mul(3));

    const ourBalance = await pool.balanceOf(owner.address);
    await pool.burn(ourBalance);
    const ourNewBalance = await pool.balanceOf(owner.address);
    expect(ourNewBalance).to.equal(ethers.constants.Zero);
    const poolETHBalance = await mockWETH.balanceOf(pool.address);
    expect(poolETHBalance).to.equal(ethers.constants.Zero);
    expect(await mockBTC.balanceOf(pool.address)).to.equal(
      ethers.constants.Zero
    );
  });

  it("Collect fees on trades", async () => {
    const pool = await deployMockIndexPool("TNDX");
    const price = await pool.getPoolPriceBUSD();

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
    await mockBUSD.approve(pool.address, price.mul(3));
    const devTeamBalanceBefore = await mockBUSD.balanceOf(devTeam.address);
    await pool.mint(expandTo18Decimals(2), price.mul(3));
    const devTeamBalanceAfter = await mockBUSD.balanceOf(devTeam.address);
    const mintFees = devTeamBalanceAfter.sub(devTeamBalanceBefore);

    expect(mintFees).to.equal(price.mul(3).div(100));

    await emptyDevAccount();
    const balanceUSDBeforeBurn = await mockBUSD.balanceOf(owner.address);
    // burn half of what we have
    await pool.burn(expandTo18Decimals(1));
    const burnFees = await mockBUSD.balanceOf(devTeam.address);
    const balanceUSDAfterBurn = await mockBUSD.balanceOf(owner.address);
    const earnedForBurn = balanceUSDAfterBurn.sub(balanceUSDBeforeBurn);

    expect(burnFees).to.equal(earnedForBurn.add(burnFees).div(100));
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
