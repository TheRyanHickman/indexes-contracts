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

contract LPTokenStakingPool is AStakingPool {

    constructor(
        address SLEV,
        address stakeToken,
        address[] memory rewardTokens,
        uint256[] memory SLEVPerBlock,
        IUniswapV2Router02 router
    ) AStakingPool(SLEV, stakeToken, rewardTokens, SLEVPerBlock, router)
    {
    }

    function calculateReward(Staker memory staker, uint blockNumber, address token) public override view returns (uint) {

        if (staker.wallet == address(0))
          return 0;
        IUniswapV2Pair pair = IUniswapV2Pair(address(_stakeToken));

        RewardTokenInfo storage tokenInfo = _rewardTokenMap[token];
        uint256 SLEVPerBlock = tokenInfo.SLEVPerBlock;

        bool isStakedToken0 = pair.token0() == token;
        (uint reserve0, uint reserve1,) = pair.getReserves();
        uint reserve = isStakedToken0 ? reserve0 : reserve1;
        uint valueInToken = (staker.stakedAmount * pair.balanceOf(msg.sender) * reserve) / (pair.totalSupply() * 1e18);
        uint256 blockRewards = (blockNumber - staker.lastUpdateBlock) * (SLEVPerBlock / _rewardTokens.length);
        return staker.rewards[tokenInfo.index] + (blockRewards * valueInToken) / 1e18;
    }
}