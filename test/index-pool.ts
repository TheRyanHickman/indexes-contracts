import { deployPair, deployPancakeExchange } from "./pancakeswap";
import {
  expandTo18Decimals,
  from18Decimals,
  logBalanceOf,
  zero,
} from "./utils";

import { BigNumber } from "@ethersproject/bignumber";
import { Contract } from "@ethersproject/contracts";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { deployMockToken } from "./token";
import { ethers } from "hardhat";
import { expect } from "chai";

describe("Index Pool", function () {
  let owner: SignerWithAddress, devTeam: SignerWithAddress;
  let mockBUSD: Contract, mockWETH: Contract, mockBTC: Contract;
  let pairs: Record<string, Contract>, router: Contract;
  let pancakeFactory: Contract;

  before(async () => {
    [owner, devTeam] = await ethers.getSigners();
    mockBUSD = await deployMockToken("Test BUSD", "TBUSD", owner.address);
    mockWETH = await deployMockToken("Test WETH", "TWETH", owner.address);
    mockBTC = await deployMockToken("Test BTC", "TBTC", owner.address);
    const exchange = await deployPancakeExchange(
      owner.address,
      mockBUSD,
      mockWETH,
      {
        WETH: {
          contract: mockWETH,
          liquidity: expandTo18Decimals(5000),
        },
        BTC: {
          contract: mockBTC,
          liquidity: expandTo18Decimals(200),
        },
      }
    );
    pairs = exchange.pairs;
    router = exchange.router;
    pancakeFactory = exchange.pancakeFactory;
  });

  it("Checks pairs are showing good prices", async () => {
    const reserves = await pairs.BTC.getReserves();
    const quote = await router.quote(
      expandTo18Decimals(100000),
      reserves[0],
      reserves[1]
    );
    expect(quote).to.equal(expandTo18Decimals(2)); // $1M should get you 2BTC
  });

  it("Swaps BTC for BUSD", async () => {
    const reserves = await pairs.BTC.getReserves();
    const amountIn = await router.getAmountIn(
      expandTo18Decimals(50000),
      reserves[1],
      reserves[0]
    );
    await mockBTC.transfer(pairs.BTC.address, amountIn);

    // selling almost 1BTC for 50000USD
    await pairs.BTC.swap(expandTo18Decimals(50000), 0, owner.address, []);
    const newBalance: BigNumber = await mockBUSD.balanceOf(owner.address);
    expect(newBalance).to.equal(BigNumber.from("80050000000000000000000000"));
  });

  it("Should buy an index", async () => {
    const pool = await deployMockIndexPool("TNDX");
    const price = await pool.getPoolPriceBUSD();
    const willingToPay = price.add(expandTo18Decimals(2000));
    await mockBUSD.approve(pool.address, willingToPay);
    await pool.mint(willingToPay, expandTo18Decimals(1));

    expect(await pool.balanceOf(owner.address)).to.equal(expandTo18Decimals(1));
    const balanceETH = await mockWETH.balanceOf(pool.address);
    expect(balanceETH).to.equal(expandTo18Decimals(2));
  });

  it("Should burn an index", async () => {
    const pool = await deployMockIndexPool("TNDX");
    const price = await pool.getPoolPriceBUSD();
    // try to buy 2TNDX
    await mockBUSD.approve(pool.address, price.mul(3));
    await pool.mint(price.mul(3), expandTo18Decimals(2));

    const ourBalance = await pool.balanceOf(owner.address);
    await pool.burn(ourBalance);
    const ourNewBalance = await pool.balanceOf(owner.address);
    expect(ourNewBalance).to.equal(zero);
    const poolETHBalance = await mockWETH.balanceOf(pool.address);
    expect(poolETHBalance).to.equal(zero);
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
    expect(await mockBUSD.balanceOf(devTeam.address)).to.equal(zero);

    // buy index
    await mockBUSD.approve(pool.address, price.mul(3));
    const balanceUSDBefore = await mockBUSD.balanceOf(owner.address);
    await pool.mint(price.mul(3), expandTo18Decimals(2));
    const balanceUSDAfter = await mockBUSD.balanceOf(owner.address);
    const spent = balanceUSDBefore.sub(balanceUSDAfter);
    const mintFees = await mockBUSD.balanceOf(devTeam.address);

    expect(mintFees).to.equal(spent.sub(mintFees).div(100));

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
    const IndexPool = await ethers.getContractFactory("IndexPool");
    const pool = await IndexPool.deploy(
      "hello world pool",
      symbol,
      [mockWETH.address, mockBTC.address],
      [2, 1],
      mockBUSD.address,
      router.address,
      pancakeFactory.address,
      devTeam.address,
      [0]
    );
    await pool.deployed();
    return pool;
  };
});
