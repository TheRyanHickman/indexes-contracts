// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "contracts/interfaces/IBEP20.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";
import "contracts/tokens/SLEVToken.sol";
import "contracts/tokens/LEVToken.sol";
import "contracts/utilities/PancakeswapUtilities.sol";
import "./AStakingPool.sol";

contract LEVTokenStakingPool is AStakingPool {

    constructor(
        address SLEV,
        address LEV,
        address[] memory rewardTokens,
        uint256[] memory SLEVPerBlock,
        IUniswapV2Router02 router
    ) AStakingPool(SLEV, LEV, rewardTokens, SLEVPerBlock, router)
    {
    }

    function calculateReward(Staker memory staker, uint blockNumber, address token) public override view returns (uint) {
      return super.calculateReward(staker, blockNumber, token);
    }
}