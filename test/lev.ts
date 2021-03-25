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
import { ethers } from "hardhat";
import { expect } from "chai";

describe("LEV token", function () {
  let owner: SignerWithAddress, devTeam: SignerWithAddress;
  let LEV: Contract,
    mockSLEV: Contract,
    mockBUSD: Contract,
    mockWETH: Contract,
    pancakeRouter: Contract,
    levSlevPair: Contract;

  before(async () => {
    [owner] = await ethers.getSigners();
    mockSLEV = await deployMockToken("Fake SLEV", "VELS", owner.address);
    mockBUSD = await deployMockToken("Fake BUSD", "DSUB", owner.address);
    mockWETH = await deployMockToken("Fake WETH", "HTEW", owner.address);
    const exchange = await deployPancakeExchange(owner, mockBUSD, mockWETH);
    pancakeRouter = exchange.pancakeRouter;
  });

  beforeEach(async () => {
    const pancakeswapUtilities = await deployPancakeUtilities();
    const LevFactory = await ethers.getContractFactory("LEVToken", {
      libraries: {
        PancakeswapUtilities: pancakeswapUtilities.address,
      },
    });
    LEV = await LevFactory.deploy(
      owner.address,
      expandTo18Decimals(100000),
      expandTo18Decimals(40),
      mockSLEV.address,
      pancakeRouter.address,
      owner.address
    );
    await deployPair(
      LEV,
      expandTo18Decimals(100000),
      mockSLEV,
      expandTo18Decimals(10000),
      pancakeRouter,
      owner
    );
  });

  it("Mints 40 LEVs a block", async () => {
    expect(LEV).to.not.equal(null);
    await LEV.updateTotalSupply();
    if (!owner.provider) throw "Missing provider";
    const blockSinceCreation =
      (await owner.provider.getBlockNumber()) - (await LEV.getCreatedAtBlock());
    expect(await LEV.totalSupply()).to.equal(
      expandTo18Decimals(100000 + 40 * blockSinceCreation)
    );
    await mineBlock(owner.provider);
    await mineBlock(owner.provider);
    await LEV.updateTotalSupply();
    expect(await LEV.totalSupply()).to.equal(
      expandTo18Decimals(100000 + 40 * (blockSinceCreation + 3))
    );
  });

  it("Can buy SLEV with minted LEV", async () => {
    await LEV.updateTotalSupply();
    const LEVSLEVBalance = await mockSLEV.balanceOf(pancakeRouter.address);
    expect(LEVSLEVBalance).to.equal(BigNumber.from("41384770731918505429"));
    expect(await LEV.balanceOf(LEV.address)).to.equal(ethers.constants.Zero);
  });
});
