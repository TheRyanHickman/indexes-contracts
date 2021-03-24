import { deployPancakeExchange, deployPancakeUtilities } from "./pancakeswap";

import { BigNumber } from "@ethersproject/bignumber";
import { Contract } from "@ethersproject/contracts";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Wallet } from "@ethersproject/wallet";
import { deployMockToken } from "./token";
import { ethers } from "hardhat";
import { expandTo18Decimals } from "./utils";
import { expect } from "chai";
import poolAbi from "../artifacts/contracts/indexes/IndexPool.sol/IndexPool.json";

describe("Pool Controller", function () {
  let owner: SignerWithAddress, devTeam: SignerWithAddress;
  let mockLEV: Contract,
    mockWETH: Contract,
    mockSLEV: Contract,
    mockBUSD: Contract,
    mockBTC: Contract,
    pancakeRouter: Contract;

  before(async () => {
    [owner] = await ethers.getSigners();
    mockLEV = await deployMockToken("Fake LEV", "VEL", owner.address);
    mockSLEV = await deployMockToken("Fake SLEV", "VELS", owner.address);
    mockBUSD = await deployMockToken("Fake BUSD", "DSUB", owner.address);
    mockBTC = await deployMockToken("Fake BTC", "CTB", owner.address);
    mockWETH = await deployMockToken("Fake WETH", "HTEW", owner.address);
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
    pancakeRouter = exchange.pancakeRouter;
  });

  it("Instantiates an Index Pool", async () => {
    const pancakeswapUtilities = await deployPancakeUtilities();
    const Controller = await ethers.getContractFactory("IndexController", {
      libraries: {
        PancakeswapUtilities: pancakeswapUtilities.address,
      },
    });
    const controllerContract = await Controller.deploy(
      mockBUSD.address,
      mockLEV.address,
      mockSLEV.address,
      pancakeRouter.address,
      owner.address
    );
    await controllerContract.createIndexPool(
      "Test INDX",
      "TNDX",
      [mockBTC.address, mockWETH.address],
      [3, 22],
      [0]
    );
    await controllerContract.deployed();
    const poolAddress = await controllerContract.pools(0);
    const pool = new Contract(poolAddress, poolAbi.abi, owner);

    const price = await pool.getPoolPriceBUSD();
    expect(price).to.equal(BigNumber.from("194000000000000000000000"));
  });
});
