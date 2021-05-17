import { expandTo18Decimals, mineBlock } from "./utils";

import { BigNumber } from "@ethersproject/bignumber";
import { Contract } from "@ethersproject/contracts";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { deployMockToken } from "./token";
import { ethers } from "hardhat";
import { expect } from "chai";

describe("Staking pools", function () {
  let owner: SignerWithAddress,
    alice: SignerWithAddress,
    bob: SignerWithAddress,
    devTeam: SignerWithAddress;
  let masterChef: Contract;
  let sushiBar: Contract;
  let LEV: Contract,
    levPair: Contract,
    SLEV: Contract,
    mockBUSD: Contract,
    pancakeRouter: Contract;

  before(async () => {
    [owner, alice, bob] = await ethers.getSigners();
    const LevFactory = await ethers.getContractFactory("LEVToken");
    LEV = await LevFactory.deploy(owner.address, expandTo18Decimals(100000));
    const BarFactory = await ethers.getContractFactory("RewardBar");
    SLEV = await BarFactory.deploy(LEV.address);
    mockBUSD = await deployMockToken("Fake BUSD", "DSUB", owner.address);

    const MasterChefFactory = await ethers.getContractFactory("MasterChef");
    masterChef = await MasterChefFactory.deploy(
      LEV.address,
      mockBUSD.address,
      SLEV.address,
      owner.address,
      expandTo18Decimals(5),
      await ethers.provider.getBlockNumber()
    );
    await LEV.transferOwnership(masterChef.address);
    await SLEV.transferOwnership(masterChef.address);
  });

  it("Should returns 0 to stacking rewards", async () => {
    const rewards = await masterChef.pendingCake(0, owner.address);
    expect(rewards).to.equal(ethers.constants.Zero);
    expect(await SLEV.balanceOf(owner.address)).to.equal(ethers.constants.Zero);
  });

  it("Gets rewarded with LEV and BUSD", async () => {
    await mockBUSD.transfer(alice.address, expandTo18Decimals(12000));
    await mockBUSD.transfer(SLEV.address, expandTo18Decimals(1000));
    await LEV.approve(masterChef.address, expandTo18Decimals(20));
    await masterChef.enterStaking(expandTo18Decimals(20));
    expect(await SLEV.balanceOf(owner.address)).to.equal(
      expandTo18Decimals(20)
    );
    await mineBlock(owner.provider);
    await mineBlock(owner.provider);
    await mineBlock(owner.provider);

    await masterChef.updatePool(0);
    const availableRewards = await masterChef.pendingCake(0, owner.address);
    const rewardBUSD = await masterChef.getRewardsBUSD();
    expect(rewardBUSD).to.equal(expandTo18Decimals(1000));
    const balanceLEVBefore = await LEV.balanceOf(owner.address);
    await masterChef.leaveStaking(0);
    const balanceLEVAfter = await LEV.balanceOf(owner.address);
    const difference = balanceLEVAfter.sub(balanceLEVBefore);
    expect(availableRewards).to.equal(expandTo18Decimals(16));
    expect(difference).to.equal(expandTo18Decimals(21)); // 16 LEV + 4 LEV + 1 LEV because we're also the dev account
    const balanceBUSD = await mockBUSD.balanceOf(owner.address);
    expect(balanceBUSD).to.equal(
      expandTo18Decimals(100000000).sub(expandTo18Decimals(12000))
    );
    await masterChef.leaveStaking(expandTo18Decimals(20));
  });

  it("Stacks LP tokens", async () => {
    // let's say the fake busd is a LP token
    await masterChef.add(1000, mockBUSD.address, false);
    await mockBUSD.transfer(alice.address, expandTo18Decimals(2));
    await mockBUSD.approve(masterChef.address, expandTo18Decimals(3));
    await mockBUSD
      .connect(alice)
      .approve(masterChef.address, expandTo18Decimals(2));
    await masterChef.deposit(1, expandTo18Decimals(3));
    await mineBlock(owner.provider);
    await masterChef.connect(alice).deposit(1, expandTo18Decimals(2));

    await mineBlock(owner.provider);
    await mineBlock(owner.provider);
    await mineBlock(owner.provider);

    const balanceLEVBefore = await LEV.balanceOf(owner.address);
    await masterChef.updatePool(1);
    await masterChef.withdraw(1, 0);
    await masterChef.connect(alice).withdraw(1, 0);
    const balanceLEVAfter = await LEV.balanceOf(owner.address);
    const difference = balanceLEVAfter.sub(balanceLEVBefore);
    expect(difference).to.equal(BigNumber.from("19504876219051330081"));
    const balanceAlice = await LEV.balanceOf(alice.address);
    expect(balanceAlice).to.equal(BigNumber.from("7201800450110000000"));
  });

  it("should fail when creating the same pool twice", async () => {
    await masterChef.add(1000, mockBUSD.address, false);
    await expect(
      masterChef.add(1000, mockBUSD.address, false)
    ).to.be.revertedWith("MasterChef: POOL_ALREADY_EXISTS");
  });
});
