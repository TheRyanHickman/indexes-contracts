import { Contract, ContractFactory } from "@ethersproject/contracts";
import {
  deployPair,
  deployPancakeExchange,
  deployPancakeUtilities,
} from "./pancakeswap";
import { expandTo18Decimals, mineBlock } from "./utils";
import hre, { ethers } from "hardhat";

import { BigNumber } from "@ethersproject/bignumber";
import { Signer } from "@ethersproject/abstract-signer";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { deployMockToken } from "./token";
import { expect } from "chai";
import { isAddress } from "@ethersproject/address";
import poolAbi from "../artifacts/contracts/indexes/IndexPool.sol/IndexPool.json";

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
      pancakeRouter.address
    );
  });

  it("Mints 40 LEVs a block", async () => {
    expect(LEV).to.not.equal(null);
    await LEV.updateTotalSupply();
    expect(await LEV.totalSupply()).to.equal(expandTo18Decimals(100000 + 40));
    await mineBlock(owner.provider);
    await mineBlock(owner.provider);
    await LEV.updateTotalSupply();
    expect(await LEV.totalSupply()).to.equal(expandTo18Decimals(100000 + 160));
  });

  it("Can buy SLEV with minted LEV", async () => {
    const levSlevPair = await deployPair(
      LEV,
      expandTo18Decimals(100000),
      mockSLEV,
      expandTo18Decimals(10000),
      pancakeRouter,
      owner
    );
    await LEV.updateTotalSupply();
    await LEV.buySLEVForBurn();
    const LEVSLEVBalance = await mockSLEV.balanceOf(pancakeRouter.address);
    expect(LEVSLEVBalance).to.equal(BigNumber.from("19900318764383818665"));
    expect(await LEV.balanceOf(LEV.address)).to.equal(ethers.constants.Zero);
  });
});
