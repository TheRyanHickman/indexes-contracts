import { ethers, network } from "hardhat";

import { Interface } from "@ethersproject/abi";
import { from18Decimals } from "../test/utils";

const env = network.name;
const addrs = require(`../addresses-${env}.json`);

const getTeamSharing = async () => {
  const teamSharingFactory = await ethers.getContractFactory("TokenSharing");
  return teamSharingFactory.attach(addrs.teamSharing);
};

const main = async () => {
  const teamSharing = await getTeamSharing();
  const tx = await teamSharing.distributeToken(addrs.tokens.LEV);
  console.log("waiting for tx...");
  await tx.wait();
};

const proposeShareholders = async () => {
  const teamSharing = await getTeamSharing();
  const shareholders = [
    // Matthieu
    {
      // jerem
      wallet: "0xaB3DAE1Dc3Aadf89D397b5B0f64b87ec172c2f73",
      shares: 2467,
      canVote: true,
    },
    {
      // rudy
      wallet: "0xA17fa6C9540E81c45e180DfCd93Eb4b1DB3Fe56B",
      shares: 2467,
      canVote: true,
    },
    {
      // mika
      wallet: "0xA750d0748A91054f36F4450d48DbAB406e479a33",
      shares: 2467,
      canVote: true,
    },
    {
      // matthieu
      wallet: "0x3eb72125ff02a0e1e6276B66f0832835F4Fc9337",
      shares: 900,
      canVote: true,
    },
    {
      // adrien
      wallet: "0x6DeBA0F8aB4891632fB8d381B27eceC7f7743A14",
      shares: 800,
      canVote: true,
    },
    {
      // gwendoudou
      wallet: "0xbE261843793f96141E1a482f8F88D3BFA12dDb75",
      shares: 300,
      canVote: false,
    },
    {
      // Hellmouth
      wallet: "0xf57247ab386242f969d1Ab528b7fFd6897D55d38",
      shares: 250,
      canVote: true,
    },
    {
      // Aurelien
      wallet: "0xee74c8da8B0192360ebb8eF490E7FAcf0deA98Ed",
      shares: 350,
      canVote: true,
    },
  ];
  const tx = await teamSharing.createProposal(shareholders);
  console.log("done... " + tx.hash);
  await tx.wait();
  const proposalId = 0;
  const tx1 = await teamSharing.approveProposal(proposalId);
  console.log("approved...", tx1.hash);
  await tx1.wait();
  const tx3 = await teamSharing.applyProposal(proposalId);
  console.log("proposal applied...", tx3.hash);
  await tx3.wait();
  // console.log("\nbalances before:");
  // await showBalances(shareholders);
  // const tx2 = await teamSharing.distributeToken(addrs.tokens.LEV);
  // console.log("dispatch...", tx2.hash);
  // await tx2.wait();
  // console.log("\nbalances now");
  // await showBalances(shareholders);
};

const showBalances = async (
  shareholders: { wallet: string; shares: number; canVote: boolean }[]
) => {
  const levFactory = await ethers.getContractFactory("ERC20");
  const lev = await levFactory.attach(addrs.tokens.LEV);
  const contractBalance = await lev.balanceOf(addrs.teamSharing);
  console.log("contract LEV balance:", from18Decimals(contractBalance));

  for (const shareholder of shareholders) {
    const balance = await lev.balanceOf(shareholder.wallet);
    console.log(
      shareholder.wallet +
        " " +
        from18Decimals(balance) +
        " (" +
        shareholder.shares / 100 +
        "%)"
    );
  }
};

const showHexForDistribute = async () => {
  const abi = ["function distributeToken(address)"];
  const iface = new Interface(abi);

  const foo = iface.encodeFunctionData("distributeToken", [addrs.tokens.WBNB]);
  console.log(foo);

  const levFactory = await ethers.getContractFactory("ERC20");
  const lev = levFactory.attach(addrs.LI);
  console.log((await lev.balanceOf(addrs.masterChef)).toString());
};
