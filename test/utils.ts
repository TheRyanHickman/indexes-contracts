import { BigNumber, Contract, Wallet } from "ethers";
import { Block, Provider } from "@ethersproject/abstract-provider";

import { formatEther } from "ethers/lib/utils";
import { randomBytes } from "crypto";

export async function mineBlock(provider: any, timestamp: number) {
  return provider.send("evm_mine", timestamp ? [timestamp] : []);
}

export function expandTo18Decimals(n: number) {
  return BigNumber.from(n).mul(BigNumber.from(10).pow(18));
}

export function from18Decimals(n: BigNumber) {
  return formatEther(n);
}

export async function getWallets(ethers: any, num: number) {
  let wallets = [];
  for (let i = 0; i < num; i++) {
    const wallet = new Wallet(randomBytes(32));
    await wallet.connect(ethers.provider);
    wallets.push(wallet);
  }
  return wallets;
}

export async function getLastBlock(provider: Provider): Promise<Block> {
  return provider.getBlock(await provider.getBlockNumber());
}

export const zero = BigNumber.from(0);

export const logBalanceOf = async (
  token: Contract,
  address: string
): Promise<BigNumber> => {
  const balance = await token.balanceOf(address);
  console.log("balance: ", from18Decimals(balance).toString());
  return balance;
};
