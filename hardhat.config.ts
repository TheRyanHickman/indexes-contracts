import "@nomiclabs/hardhat-waffle";
import "@nomiclabs/hardhat-etherscan";
import "hardhat-gas-reporter";

import { HardhatUserConfig } from "hardhat/types";

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

let accounts = {
  mnemonic: process.env.MNEMONIC,
  initialIndex: 0,
  count: 20,
  accountsBalance: "990000000000000000000",
};

if (!process.env.MNEMONIC) accounts = undefined;

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.4",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      accounts: process.env.MNEMONIC && accounts,
      forking: {
        url: "https://bsc-dataseed.binance.org",
      },
      mining: {
        auto: false,
        interval: 3000,
      },
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      accounts: accounts,
    },
    mainnet: {
      url: "https://bsc-dataseed.binance.org/",
      chainId: 56,
      accounts: accounts,
    },
    polygon: {
      url: "https://rpc-mainnet.matic.network",
      chainId: 137,
      accounts,
    },
  },
  gasReporter: {
    currency: "USD",
    coinmarketcap: "f23881e4-61d8-4f11-a129-280693461115",
    gasPrice: 5,
    enabled: process.env.REPORT_GAS ? true : false,
  },
  etherscan: {
    apiKey: "7BS63ZC78Z1BM34YDE28CX8V2B6W7BC8DR",
  },
};

export default config;
