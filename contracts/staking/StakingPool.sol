// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "contracts/interfaces/IBEP20.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";
import "contracts/staking/SLEVToken.sol";
import "contracts/tokens/LEVToken.sol";
import "contracts/utilities/PancakeswapUtilities.sol";

contract StakingPool {
    uint256 public totalStaked;
    SLEVToken immutable _SLEV;
    IBEP20 immutable _stakeToken;
    RewardTokenInfo[] public _rewardTokens;
    IUniswapV2Router02 immutable _router;
    mapping(address => Staker) _stakers;
    mapping(address => RewardTokenInfo) _rewardTokenMap;

    constructor(
        address SLEV,
        address stakeToken,
        address[] memory rewardTokens,
        uint256[] memory multiplier,
        IUniswapV2Router02 router
    ) {
        require(
            rewardTokens.length == multiplier.length,
            "reward tokens and reward per block arrays must have the same size."
        );
        _SLEV = SLEVToken(SLEV);
        _router = router;
        _stakeToken = IBEP20(stakeToken);
        for (uint256 i = 0; i < rewardTokens.length; i++) {
            address rewardTokenAddress = rewardTokens[i];
            ERC20 rewardToken = ERC20(rewardTokenAddress);
            _rewardTokens.push(
                RewardTokenInfo({
                    rewardToken: rewardToken,
                    multiplier: multiplier[i],
                    index: i
                })
            );
            _rewardTokenMap[rewardTokenAddress] = _rewardTokens[i];
        }
    }

    modifier stakerOnly {
        require(
            _stakers[msg.sender].wallet != address(0),
            "You must be a staker."
        );
        _;
    }

    modifier minStakedAmount(uint256 amount) {
        require(
            _stakers[msg.sender].stakedAmount >= amount,
            "Staked amount insufficient."
        );
        _;
    }

    function calculateRewards(Staker storage staker, uint256 blockNumber)
        private
        view
        returns (uint256[] memory)
    {
        uint256[] memory rewards = new uint256[](_rewardTokens.length);
        for (uint256 i = 0; i < _rewardTokens.length; i++) {
            rewards[i] = calculateReward(staker, blockNumber, address(_rewardTokens[i].rewardToken));
        }
        return rewards;
    }

    function calculateReward(Staker memory staker, uint blockNumber, address token) public view returns (uint) {
        if (staker.wallet == address(0))
          return 0;
        RewardTokenInfo storage tokenInfo = _rewardTokenMap[token];
        uint256 multiplier = tokenInfo.multiplier;
        uint256 blockRewards = (blockNumber - staker.lastUpdateBlock) * multiplier;
        return staker.rewards[tokenInfo.index] + (blockRewards * staker.stakedAmount) / totalStaked;
    }

    function updateRewards(Staker storage staker, uint256 blockNumber)
        private
    {
        staker.rewards = calculateRewards(staker, blockNumber);
        staker.lastUpdateBlock = blockNumber;
        staker.totalStakedOnLastUpdate = totalStaked;
    }

    function stack(uint256 stackAmount) public {
        _stakeToken.transferFrom(msg.sender, address(this), stackAmount);
        Staker storage staker = _stakers[msg.sender];
        if (staker.wallet == address(0))
            initializeStaker(staker, msg.sender, stackAmount);
        else {
            staker.stakedAmount += stackAmount;
            updateRewards(staker, block.number);
        }
        totalStaked += stackAmount;
    }

    function unstack(uint256 amount)
        public
        stakerOnly
        minStakedAmount(amount)
    {
        _stakeToken.transferFrom(address(this), msg.sender, amount);
        Staker storage staker = _stakers[msg.sender];
        updateRewards(staker, block.number);
        staker.stakedAmount -= amount;
        if (staker.stakedAmount == 0) delete _stakers[msg.sender];
        totalStaked -= amount;
    }

    function leave() public stakerOnly {
        Staker storage staker = _stakers[msg.sender];
        collectAllRewards();
        unstack(staker.stakedAmount);
    }

    function collectAllRewards() public stakerOnly {
        for (uint256 i = 0; i < _rewardTokens.length; i++) {
            address rewardTokenAddress = address(_rewardTokens[i].rewardToken);
            collectReward(rewardTokenAddress);
        }
    }

    function collectReward(address rewardTokenAddress) public stakerOnly {
        Staker storage staker = _stakers[msg.sender];
        updateRewards(staker, block.number);
        RewardTokenInfo memory rewardTokenInfo =
            _rewardTokenMap[rewardTokenAddress];
        uint256 SLEVAmount = staker.rewards[rewardTokenInfo.index];
        if (SLEVAmount == 0)
            return;
        staker.rewards[rewardTokenInfo.index] = 0;
        _SLEV.mint(address(this), SLEVAmount);
        PancakeswapUtilities.sellToken(
            address(_SLEV),
            address(rewardTokenInfo.rewardToken),
            staker.wallet,
            SLEVAmount,
            _router
        );
    }

    function initializeStaker(
        Staker storage staker,
        address wallet,
        uint256 stackAmount
    ) private {
        staker.wallet = wallet;
        staker.stakedAmount = stackAmount;
        staker.lastUpdateBlock = block.number;
        staker.totalStakedOnLastUpdate = totalStaked + stackAmount;
        staker.rewards = new uint256[](_rewardTokens.length);
    }

    function getCurrentReward(address wallet)
        private
        view
        returns (uint[] memory)
    {
        return calculateRewards(_stakers[wallet], block.number);
    }

    function getCurrentReward(address wallet, address token) private view returns (uint) {
        if (wallet == address(0))
            return 0;
        return calculateReward(_stakers[wallet], block.number, token);
    }

    function getCurrentRewards(address wallet, address token)
        public
        view
        returns (uint)
    {
        uint totalRewardSLEV = getCurrentReward(wallet, token);
        if (totalRewardSLEV == 0)
            return 0;
        console.log("Router:", address(_router));
        IUniswapV2Pair pair = IUniswapV2Pair(PancakeswapUtilities.getPair(token, address(_SLEV), _router.factory()));
        console.log("Done requesting facto");
        (uint reservesA, uint reservesB) = PancakeswapUtilities.getReservesOrdered(pair, token, address(_SLEV));
        return _router.quote(totalRewardSLEV, reservesB, reservesA);
    }

    function getStaker(address stakerAddress)
        public
        view
        returns (Staker memory)
    {
        return _stakers[stakerAddress];
    }

    function getStakedAmount() external view returns(uint256) {
        Staker memory staker = _stakers[msg.sender];
        if (staker.wallet == address(0))
          return 0;
        return _stakers[msg.sender].stakedAmount;
    }

    function getRewardPerBlock() external view returns (uint) {
        uint total = 0;
        for (uint i = 0; i < _rewardTokens.length; i++) {
            total += _rewardTokens[i].multiplier;
        }
        return total;
    }
}

struct RewardTokenInfo {
    ERC20 rewardToken;
    uint256 index;
    uint256 multiplier;
}

struct Staker {
    uint256 stakedAmount;
    uint256 lastUpdateBlock;
    uint256 totalStakedOnLastUpdate;
    address wallet;
    uint256[] rewards;
}
