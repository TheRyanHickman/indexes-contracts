import "@nomiclabs/hardhat-waffle";

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
export default {
  solidity: "0.8.2",
  networks: {
    ropsten: {
      url:
        "https://eth-ropsten.alchemyapi.io/v2/ZQbxa1IVe__nSxdbJ99FklB55mZZCqzR",
      chainId: 3,
      accounts: [
        "1d44492875c0bae585e61ecb36e07a24cb27c300efea0ce9a4d1465d8d204a40",
      ],
    },
    testnet: {
      url: "https://data-seed-prebsc-1-s1.binance.org:8545",
      chainId: 97,
      accounts: [
        "1d44492875c0bae585e61ecb36e07a24cb27c300efea0ce9a4d1465d8d204a40",
      ],
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      accounts: [
        "0xdf57089febbacf7ba0bc227dafbffa9fc08a93fdc68e1e42411a14efcf23656e",
      ],
    },
    hardhat: {
      mining: {
        auto: true,
        interval: 15000,
      },
    },
  },
};
