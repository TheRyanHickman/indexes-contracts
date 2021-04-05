import { BigNumber, Contract } from "ethers";

import { expandTo18Decimals } from "../test/utils";

const getTokenPriceUSD = async (
  token: string,
  router: Contract,
  BNB: string,
  BUSD: string
) => {
  let path = [token, BNB, BUSD];
  if (token === BNB) path = [token, BUSD];
  const amounts: BigNumber[] = await router.getAmountsOut(
    expandTo18Decimals(1),
    path
  );
  return token === BNB ? amounts[1] : amounts[2];
};

export const computeTargetWeights = async (
  tokens: string[],
  weights: number[],
  router: Contract,
  BNB: string,
  BUSD: string
) => {
  let pricesUSDBN = [];
  for (const tok of tokens) {
    const p = await getTokenPriceUSD(tok, router, BNB, BUSD);
    pricesUSDBN.push(p);
  }
  const pricesUSD = pricesUSDBN.map(
    (p: BigNumber) =>
      p.div(BigNumber.from("1000000000000")).toNumber() / 1000000
  );
  const total = pricesUSD.reduce((acc: any, p: any) => acc + p, 0);
  const adjustedWeights = pricesUSD.map((p: number, index: number) => {
    return Math.round((weights[index] * total) / (p * 10));
  });
  return adjustedWeights;
};
