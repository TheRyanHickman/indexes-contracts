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
    levPair: Contract,
    stackingPoolLev: Contract,
    SLEV: Contract,
    mockLEV: Contract,
    mockBUSD: Contract,
    pancakeRouter: Contract;

  before(async () => {
    [owner] = await ethers.getSigners();
    SLEV = (await deploySLEV(owner.address)) as Contract;
    mockLEV = await deployMockToken("Fake LEV", "VEL", owner.address);
    mockBUSD = await deployMockToken("Fake BUSD", "DSUB", owner.address);
    const exchange = await deployPancakeExchange(owner, {
      BUSD: {
        contract: mockBUSD,
        liquidity: expandTo18Decimals(10000),
      },
    });
    pancakeRouter = exchange.pancakeRouter;
    levPair = await deployPair(
      mockLEV,
      expandTo18Decimals(100000),
      SLEV,
      expandTo18Decimals(10000),
      pancakeRouter,
      owner
    );
    const slevPair = await deployPair(
      mockBUSD,
      expandTo18Decimals(1000),
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
    stackingPoolLev = await StackingPoolFactory.deploy(
      SLEV.address,
      mockLEV.address,
      ethers.constants.AddressZero,
      [mockLEV.address, mockBUSD.address],
      [expandTo18Decimals(1), expandTo18Decimals(1)],
      pancakeRouter.address
    );
    await SLEV.setMinters([owner.address, stackingPoolLev.address]);
  });

  it("Should returns 0 to stacking rewards", async () => {
    const rewards = await stackingPoolLev.getCurrentRewards(
      owner.address,
      mockLEV.address
    );
    expect(rewards).to.equal(ethers.constants.Zero);
    expect(await stackingPoolLev.getStackedAmount()).to.equal(
      ethers.constants.Zero
    );
  });

  it("Generates rewards in SLEV", async () => {
    const balanceLEVBefore = await mockLEV.balanceOf(owner.address);
    await mockLEV.approve(stackingPoolLev.address, expandTo18Decimals(20));
    await stackingPoolLev.stack(expandTo18Decimals(20));
    expect(await mockLEV.balanceOf(owner.address)).to.equal(
      balanceLEVBefore.sub(expandTo18Decimals(20))
    );
    expect(await stackingPoolLev.getStackedAmount()).to.equal(
      expandTo18Decimals(20)
    );
    await mineBlock(owner.provider);
    await mineBlock(owner.provider);

    await mockLEV.approve(stackingPoolLev.address, expandTo18Decimals(1));
    await stackingPoolLev.stack(expandTo18Decimals(1));
    await mineBlock(owner.provider);
    expect(await stackingPoolLev.getStackedAmount()).to.equal(
      expandTo18Decimals(21)
    );
    expect(
      await stackingPoolLev.getCurrentRewards(owner.address, mockLEV.address)
    ).to.equal(expandTo18Decimals(525));
  });

  it("Gets rewarded with LEV", async () => {
    await mockLEV.approve(stackingPoolLev.address, expandTo18Decimals(20));
    await stackingPoolLev.stack(expandTo18Decimals(12));
    await mineBlock(owner.provider);
    await mineBlock(owner.provider);
    await mineBlock(owner.provider);
    const balanceLEVBefore = await mockLEV.balanceOf(owner.address);
    const availableRewards = await stackingPoolLev.getCurrentRewards(
      owner.address,
      mockLEV.address
    );
    await stackingPoolLev.collectAllRewards();
    const balanceLEVAfter = await mockLEV.balanceOf(owner.address);
    const difference = balanceLEVAfter.sub(balanceLEVBefore);
    expect(difference).to.equal(BigNumber.from("1545998570940169257196"));
    expect(availableRewards).to.equal(BigNumber.from("1410000000000000000000"));
  });

  it("Stacks LP tokens", async () => {
    const pancakeswapUtilities = (await deployPancakeUtilities()) as Contract;
    const StackingPoolFactory = await ethers.getContractFactory(
      "LEVStackingPool",
      {
        libraries: {
          PancakeswapUtilities: pancakeswapUtilities.address,
        },
      }
    );
    const stackingPoolLP = await StackingPoolFactory.deploy(
      SLEV.address,
      levPair.address,
      levPair.address,
      [mockLEV.address],
      [expandTo18Decimals(1)],
      pancakeRouter.address
    );
    await levPair.approve(stackingPoolLP.address, expandTo18Decimals(2));
    await stackingPoolLP.stack(expandTo18Decimals(2));
    await mineBlock(owner.provider);
    await mineBlock(owner.provider);
    await mineBlock(owner.provider);
    const balanceLEVBefore = await mockLEV.balanceOf(owner.address);
    const availableRewards = await stackingPoolLev.getCurrentRewards(
      owner.address,
      mockLEV.address
    );
    await stackingPoolLev.collectAllRewards();
    const balanceLEVAfter = await mockLEV.balanceOf(owner.address);
    const difference = balanceLEVAfter.sub(balanceLEVBefore);
    expect(difference).to.equal(BigNumber.from("1259287534081683882782"));
    expect(availableRewards).to.equal(BigNumber.from("1119511411770259458606"));
  });
});
