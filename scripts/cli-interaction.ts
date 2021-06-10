import { ethers, network } from "hardhat";
import inquirer, { DistinctQuestion } from "inquirer";

import { BigNumber } from "@ethersproject/bignumber";

export const readTokenAddress = async (message: string) => {
  const tokenPickQuestion: DistinctQuestion = {
    name: "token",
    message,
    type: "input",
  };
  const response = await inquirer.prompt([tokenPickQuestion]);
  return response.token;
};

export const readAddress = readTokenAddress.bind(null, "target address");

export const readAmountETH = async () => {
  const amountQuestion: DistinctQuestion = {
    name: "amount",
    message: "Enter the amount to add in ETH",
    type: "number",
    default: "0.1",
  };
  const response = await inquirer.prompt([amountQuestion]);
  return response.amount;
};

export const readNumber = async (message: string) => {
  const question: DistinctQuestion = {
    name: "count",
    message,
    type: "number",
    default: "1",
  };
  const response = await inquirer.prompt([question]);
  return response.count;
};
