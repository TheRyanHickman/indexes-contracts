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
    mockWETH: Contract,
    pancakeRouter: Contract;

  before(async () => {
    [owner] = await ethers.getSigners();
    SLEV = await deploySLEV(owner.address);
    mockLEV = await deployMockToken("Fake LEV", "VEL", owner.address);
    mockBUSD = await deployMockToken("Fake BUSD", "DSUB", owner.address);
    mockWETH = await deployMockToken("Fake WETH", "HTEW", owner.address);
    const exchange = await deployPancakeExchange(owner, mockBUSD, mockWETH);
    pancakeRouter = exchange.pancakeRouter;
    await deployPair(
      mockLEV,
      expandTo18Decimals(100000),
      SLEV,
      expandTo18Decimals(10000),
      pancakeRouter,
      owner
    );

    const pancakeswapUtilities = await deployPancakeUtilities();
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
  });

  it("Generates rewards in SLEV", async () => {
    const balanceLEVBefore = await mockLEV.balanceOf(owner.address);
    await mockLEV.approve(stackingPool.address, expandTo18Decimals(20));
    await stackingPool.stack(expandTo18Decimals(20));
    expect(await mockLEV.balanceOf(owner.address)).to.equal(
      balanceLEVBefore.sub(expandTo18Decimals(20))
    );
    await mineBlock(owner.provider);
    await mineBlock(owner.provider);
    const currentReward = await stackingPool.getCurrentRewards(
      owner.address,
      mockLEV.address
    );
    expect(currentReward).to.equal(expandTo18Decimals(40));
  });

  it("Gets rewarded with LEV", async () => {
    await mockLEV.approve(stackingPool.address, expandTo18Decimals(20));
    await stackingPool.stack(expandTo18Decimals(12));
    await mineBlock(owner.provider);
    await mineBlock(owner.provider);
    await mineBlock(owner.provider);
    const balanceLEVBefore = await mockLEV.balanceOf(owner.address);
    await stackingPool.collectAllRewards();
    const balanceLEVAfter = await mockLEV.balanceOf(owner.address);
    expect(balanceLEVAfter.sub(balanceLEVBefore)).to.equal(
      BigNumber.from("791288681476543092295")
    );
  });
});
