import { Contract, ContractFactory } from "@ethersproject/contracts";
import { expandTo18Decimals, mineBlock } from "./utils";

import { BigNumber } from "@ethersproject/bignumber";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { deployMockToken } from "./token";
import { ethers } from "hardhat";
import { expect } from "chai";

describe("Token Sharing", function () {
  let owner: SignerWithAddress,
    other: SignerWithAddress,
    other2: SignerWithAddress,
    devTeam: SignerWithAddress;
  let LEV: Contract, mockLEV: Contract, mockBUSD: Contract;
  let tokenSharing: Contract;

  before(async () => {
    [owner, other, other2] = await ethers.getSigners();
    mockLEV = await deployMockToken("Fake LEV", "VEL", owner.address);
    mockBUSD = await deployMockToken("Fake BUSD", "DSUB", owner.address);
  });

  beforeEach(async () => {
    const tokenSharingFactory = await ethers.getContractFactory("TokenSharing");
    tokenSharing = await tokenSharingFactory.deploy(owner.address, [
      mockLEV.address,
      mockBUSD.address,
    ]);
  });

  it("Fails, not being a shareholder", async () => {
    let errMsg = "";
    try {
      await tokenSharing.connect(other).applyProposal(0);
    } catch (err) {
      errMsg = err.message;
    }
    expect(errMsg.endsWith("SHARING: NOT_SHAREHOLDER")).to.be.true;
  });

  it("Creates a proposal", async () => {
    await tokenSharing.createProposal([
      shareholder(120, owner.address),
      shareholder(40, other.address),
      shareholder(50, other2.address),
    ]);
    const proposal = await tokenSharing.getProposal(0);
    expect(proposal.author === owner.address);
    expect(proposal.newShareholders.length).to.equal(3);
    let errMsg = "";
    try {
      await tokenSharing.applyProposal(42);
    } catch (err) {
      errMsg = err.message;
    }
    expect(errMsg.endsWith("SHARING: UNKNOWN_PROPOSAL_ID")).to.be.true;

    await tokenSharing.approveProposal(0);
    await tokenSharing.applyProposal(0);
    const shareholders = await tokenSharing.getShareholders();
    expect(shareholders.length).to.equal(3);
    expect(shareholders[0].shares).to.equal(120);
    expect(shareholders[1].shares).to.equal(40);
    expect(shareholders[2].shares).to.equal(50);
    expect(shareholders[2].wallet).to.equal(other2.address);
  });

  it("Checks proposal votes are calculated properly", async () => {
    await tokenSharing.createProposal([
      shareholder(20, owner.address),
      shareholder(30, other.address),
      shareholder(40, other2.address),
    ]);
    await tokenSharing.approveProposal(0);
    await tokenSharing.applyProposal(0);
    await tokenSharing
      .connect(other2)
      .createProposal([
        shareholder(299, owner.address),
        shareholder(601, other.address),
        shareholder(100, other2.address),
      ]);
    let errMsg = "";
    try {
      await tokenSharing.applyProposal(1);
    } catch (err) {
      errMsg = err.message;
    }
    expect(errMsg.endsWith("PROPOSAL_NOT_APPROVED")).to.be.true;
    await tokenSharing.approveProposal(1);
    await tokenSharing.connect(other).approveProposal(1);
    await tokenSharing.connect(other2).approveProposal(1);
    await tokenSharing.applyProposal(1);
    const shareholders = await tokenSharing.getShareholders();
    expect(shareholders[1].shares).to.equal(601);
    expect(shareholders[1].wallet).to.equal(other.address);
    await tokenSharing.deleteProposal(0);
    await tokenSharing.connect(other2).deleteProposal(1);
  });

  it("Shares tokens appropriately", async () => {
    await tokenSharing.createProposal([
      shareholder(10, owner.address),
      shareholder(20, other.address),
      shareholder(10, other2.address),
    ]);
    await tokenSharing.approveProposal(0);
    await tokenSharing.applyProposal(0);
    await mockLEV.transfer(tokenSharing.address, expandTo18Decimals(40));
    await mockBUSD.transfer(tokenSharing.address, expandTo18Decimals(100));
    await tokenSharing.distributeAllTokens();

    expect(await mockLEV.balanceOf(other.address)).to.equal(
      expandTo18Decimals(20)
    );
    expect(await mockLEV.balanceOf(other2.address)).to.equal(
      expandTo18Decimals(10)
    );
    expect(await mockBUSD.balanceOf(other2.address)).to.equal(
      expandTo18Decimals(25)
    );
  });

  const shareholder = (shares: number, wallet: string, canVote = true) => ({
    shares,
    wallet,
    canVote,
  });
});
