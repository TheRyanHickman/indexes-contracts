import {
  deployPair,
  deployPancakeExchange,
  deployPancakeUtilities,
} from "./pancakeswap";
import { expandTo18Decimals, mineBlock } from "./utils";

import { BigNumber } from "@ethersproject/bignumber";
import { Contract } from "@ethersproject/contracts";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { deployMockToken } from "./token";
import { deploySLEV } from "../scripts/deploy-tokens";
import { ethers } from "hardhat";
import { expect } from "chai";

describe("Stacking pools", function () {
  let owner: SignerWithAddress, devTeam: SignerWithAddress;
  let LEV: Contract,
    stackingPool: Contract,
    SLEV: Contract,
    mockLEV: Contract,
    mockBUSD: Contract,
    pancakeRouter: Contract;

  before(async () => {
    [owner] = await ethers.getSigners();
    SLEV = (await deploySLEV(owner.address)) as Contract;
    mockLEV = await deployMockToken("Fake LEV", "VEL", owner.address);
    mockBUSD = await deployMockToken("Fake BUSD", "DSUB", owner.address);
    const exchange = await deployPancakeExchange(owner);
    pancakeRouter = exchange.pancakeRouter;
    await deployPair(
      mockLEV,
      expandTo18Decimals(100000),
      SLEV,
      expandTo18Decimals(10000),
      pancakeRouter,
      owner
    );

    const pancakeswapUtilities = (await deployPancakeUtilities()) as Contract;
    const StackingPoolFactory = await ethers.getContractFactory(
      "LEVStackingPool",
      {
        libraries: {
          PancakeswapUtilities: pancakeswapUtilities.address,
        },
      }
    );
    stackingPool = await StackingPoolFactory.deploy(
      SLEV.address,
      mockLEV.address,
      [mockLEV.address],
      [expandTo18Decimals(1)],
      pancakeRouter.address
    );
    await SLEV.setMinter(stackingPool.address);
  });

  it("Should returns 0 to stacking rewards", async () => {
    const rewards = await stackingPool.getCurrentRewards(
      owner.address,
      mockLEV.address
    );
    expect(rewards).to.equal(ethers.constants.Zero);
    expect(await stackingPool.getStackedAmount()).to.equal(
      ethers.constants.Zero
    );
  });

  it("Generates rewards in SLEV", async () => {
    const balanceLEVBefore = await mockLEV.balanceOf(owner.address);
    await mockLEV.approve(stackingPool.address, expandTo18Decimals(20));
    await stackingPool.stack(expandTo18Decimals(20));
    expect(await mockLEV.balanceOf(owner.address)).to.equal(
      balanceLEVBefore.sub(expandTo18Decimals(20))
    );
    expect(await stackingPool.getStackedAmount()).to.equal(
      expandTo18Decimals(20)
    );
    await mineBlock(owner.provider);
    await mineBlock(owner.provider);

    await mockLEV.approve(stackingPool.address, expandTo18Decimals(1));
    await stackingPool.stack(expandTo18Decimals(1));
    await mineBlock(owner.provider);
    expect(await stackingPool.getStackedAmount()).to.equal(
      expandTo18Decimals(21)
    );
    expect(
      await stackingPool.getCurrentRewards(owner.address, mockLEV.address)
    ).to.equal(expandTo18Decimals(1050));
  });

  it("Gets rewarded with LEV", async () => {
    await mockLEV.approve(stackingPool.address, expandTo18Decimals(20));
    await stackingPool.stack(expandTo18Decimals(12));
    await mineBlock(owner.provider);
    await mineBlock(owner.provider);
    await mineBlock(owner.provider);
    const balanceLEVBefore = await mockLEV.balanceOf(owner.address);
    const availableRewards = await stackingPool.getCurrentRewards(
      owner.address,
      mockLEV.address
    );
    await stackingPool.collectAllRewards();
    const balanceLEVAfter = await mockLEV.balanceOf(owner.address);
    const difference = balanceLEVAfter.sub(balanceLEVBefore);
    expect(difference).to.equal(BigNumber.from("3044922680749714830878"));
    expect(availableRewards).to.equal(BigNumber.from("2820000000000000000000"));
  });
});
