#!/bin/bash

NETWORK=localhost
#npx hardhat run --network localhost ./scripts/deploy-utilities.ts &&
#npx hardhat run --network localhost ./scripts/deploy-staking.ts &&
npx hardhat run --network $NETWORK ./scripts/deploy-index.ts &&
cp addresses-$NETWORK.json ~/code/indexes-app/src/deployed-contracts-mainnet.json
echo "done"
