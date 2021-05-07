import * as R from "ramda";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers } from "hardhat";

import { deployPancakeExchange } from "../test/pancakeswap";
import { deployMockToken } from "../test/token";
import { expandTo18Decimals } from "../test/utils";

const deployFakeTokens = async (tokens: string[], owner: SignerWithAddress) => {
  const deployedTokens = [];
  for (const token of tokens) {
    deployedTokens.push({
      contract: await deployMockToken(token, token, owner.address),
      liquidity: expandTo18Decimals(100000),
      key: token,
    });
  }
  return deployedTokens;
};

export const main = async () => {
  const [owner] = await ethers.getSigners();
  const fakeTokSym = [
    "BTC",
    "ETH",
    "WBNB",
    "DOT",
    "LINK",
    "ADA",
    "LTC",
    "ATOM",
    "UNI",
    "BCH",
    "BUSD",
  ];
  const fakeTokens = await deployFakeTokens(fakeTokSym, owner);
  const fakeExchange = await deployPancakeExchange(
    owner,
    R.zipObj(fakeTokSym, fakeTokens)
  );

  return {
    tokens: fakeTokens.map((t) => ({
      key: t.key,
      address: t.contract.address,
    })),
    pairs: Object.values(fakeExchange.pairs).map((p) => p.address),
    pancakeRouter: fakeExchange.pancakeRouter.address,
    pancakeFactory: fakeExchange.pancakeFactory.address,
    WBNB: fakeExchange.WBNB.address,
  };
};

main().then(console.log);
