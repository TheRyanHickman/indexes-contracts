// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  // We get the contract to deploy
  const TokenSharing = await hre.ethers.getContractFactory("TokenSharing");

  const sharer = await TokenSharing.deploy([]);

  await sharer.deployed();
  const resp = await sharer.test([
    {
      wallet: "0x6DeBA0F8aB4891632fB8d381B27eceC7f7743A14",
      shares: 12,
    },
  ]);
  console.log(resp);

  console.log("sharer deployed to:", sharer.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
