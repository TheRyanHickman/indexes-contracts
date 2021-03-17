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
  const myAddress = await TokenSharing.signer.getAddress();
  const sharer = await TokenSharing.deploy(myAddress);
  await sharer.deployed();

  await sharer.createProposal([
    {
      wallet: sharer.address,
      shares: 12,
    },
  ]);

  await sharer.applyProposal(0)

  await sharer.createProposal([
    {
      wallet: sharer.address,
      shares: 12,
    },
  ]);

  await sharer.applyProposal(1)

  const shareholders= await sharer.getShareholders();
  console.log(shareholders)

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
