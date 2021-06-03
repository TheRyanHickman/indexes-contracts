import { ethers, network } from "hardhat";

import { computeTargetWeights } from "./calculate-weights";
import { getPancakeRouter } from "../test/pancakeswap";
import { indexesDesc } from "./deploy-index";

const env = network.name;
const addrs = require(`../addresses-${env}.json`);

const rebalance = async (indexAddress: string) => {
  const indexFactory = await ethers.getContractFactory("IndexPool", {
    libraries: {
      PancakeswapUtilities: addrs.pancakeUtilities,
    },
  });
  const index = indexFactory.attach(indexAddress);
  const symbol = (await index.symbol()) as "LI" | "DBI";
  const indexDesc = indexesDesc[symbol];
  const router = await getPancakeRouter(addrs.pancakeRouter);
  const prevWeights = await index._tokenWeights();

  console.log("calculating taget weights...");
  indexDesc.weights[8] = 0;
  console.log(
    indexDesc.underlyingTokens,
    indexDesc.weights,
    router,
    addrs.tokens.WBNB,
    addrs.tokens.BUSD
  );
  let newWeights = await computeTargetWeights(
    indexDesc.underlyingTokens,
    indexDesc.weights,
    router,
    addrs.tokens.WBNB,
    addrs.tokens.BUSD
  );

  newWeights = newWeights.map((w) => (w >= 2 ** 16 ? (w = 2 ^ 16) : w));
  newWeights = newWeights.map((w) => Math.floor(w * 0.7));
  newWeights = newWeights.map((w, index) =>
    w > prevWeights[index] ? (w = prevWeights[index]) : w
  );

  const tx = await index.changeWeights(newWeights);
  console.log("waiting for tx...", tx.hash);
  await tx.wait();
};

rebalance("0xADb31e24bE04846754f13ad5c4AdceC36CE9415e");
