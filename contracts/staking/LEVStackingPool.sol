// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "contracts/interfaces/IBEP20.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";
import "contracts/tokens/SLEVToken.sol";
import "contracts/tokens/LEVToken.sol";
import "contracts/utilities/PancakeswapUtilities.sol";

contract LEVStackingPool {
    uint256 _totalStacked;
    SLEVToken _SLEV;
    IBEP20 _stakeToken;
    RewardTokenInfo[] _rewardTokens;
    IUniswapV2Router02 _router;
    mapping(address => Stacker) _stackers;
    mapping(address => RewardTokenInfo) _rewardTokenMap;

    constructor(
        address SLEV,
        address stakeToken,
        address[] memory rewardTokens,
        uint256[] memory SLEVPerBlock,
        IUniswapV2Router02 router
    ) {
        require(
            rewardTokens.length == SLEVPerBlock.length,
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
                    SLEVPerBlock: SLEVPerBlock[i],
                    index: i
                })
            );
            _rewardTokenMap[rewardTokenAddress] = _rewardTokens[i];
        }
    }

    modifier stackerOnly {
        require(
            _stackers[msg.sender].wallet != address(0),
            "You must be a stacker."
        );
        _;
    }

    modifier minStackedAmount(uint256 amount) {
        require(
            _stackers[msg.sender].stackedAmount >= amount,
            "Stacked amount insufficient."
        );
        _;
    }

    function calculateRewards(Stacker storage stacker, uint256 blockNumber)
        private
        view
        returns (uint256[] memory)
    {
        uint256[] memory rewards = new uint256[](_rewardTokens.length);
        for (uint256 i = 0; i < _rewardTokens.length; i++) {
            rewards[i] = calculateReward(stacker, blockNumber, address(_rewardTokens[i].rewardToken));
        }
        return rewards;
    }

    function calculateReward(Stacker storage stacker, uint blockNumber, address token) private view returns (uint) {
        if (stacker.wallet == address(0))
          return 0;
        RewardTokenInfo storage tokenInfo = _rewardTokenMap[token];
        uint256 SLEVPerBlock = tokenInfo.SLEVPerBlock;
        uint256 blockRewards = (blockNumber - stacker.lastUpdateBlock) * SLEVPerBlock;
        return stacker.rewards[tokenInfo.index] + (blockRewards * stacker.stackedAmount) / 1e18;
    }

    function updateRewards(Stacker storage stacker, uint256 blockNumber)
        private
    {
        stacker.rewards = calculateRewards(stacker, blockNumber);
        stacker.lastUpdateBlock = blockNumber;
        stacker.totalStackedOnLastUpdate = _totalStacked;
    }

    function stack(uint256 stackAmount) public {
        _stakeToken.transferFrom(msg.sender, address(this), stackAmount);
        Stacker storage stacker = _stackers[msg.sender];
        if (stacker.wallet == address(0))
            initializeStacker(stacker, msg.sender, stackAmount);
        else {
            stacker.stackedAmount += stackAmount;
            updateRewards(stacker, block.number);
        }
        _totalStacked += stackAmount;
    }

    function unstack(uint256 amount)
        public
        stackerOnly
        minStackedAmount(amount)
    {
        _stakeToken.transferFrom(address(this), msg.sender, amount);
        Stacker storage stacker = _stackers[msg.sender];
        updateRewards(stacker, block.number);
        stacker.stackedAmount -= amount;
        if (stacker.stackedAmount == 0) delete _stackers[msg.sender];
        _totalStacked -= amount;
    }

    function leave() public stackerOnly {
        Stacker storage stacker = _stackers[msg.sender];
        collectAllRewards();
        unstack(stacker.stackedAmount);
    }

    function collectAllRewards() public stackerOnly {
        for (uint256 i = 0; i < _rewardTokens.length; i++) {
            address rewardTokenAddress = address(_rewardTokens[i].rewardToken);
            collectReward(rewardTokenAddress);
        }
    }

    function collectReward(address rewardTokenAddress) public stackerOnly {
        Stacker storage stacker = _stackers[msg.sender];
        updateRewards(stacker, block.number);
        RewardTokenInfo memory rewardTokenInfo =
            _rewardTokenMap[rewardTokenAddress];
        uint256 SLEVAmount = stacker.rewards[rewardTokenInfo.index];
        stacker.rewards[rewardTokenInfo.index] = 0;
        _SLEV.mint(address(this), SLEVAmount);
        PancakeswapUtilities.sellToken(
            address(_SLEV),
            address(rewardTokenInfo.rewardToken),
            stacker.wallet,
            SLEVAmount,
            _router
        );
    }

    function initializeStacker(
        Stacker storage stacker,
        address wallet,
        uint256 stackAmount
    ) private {
        stacker.wallet = wallet;
        stacker.stackedAmount = stackAmount;
        stacker.lastUpdateBlock = block.number;
        stacker.totalStackedOnLastUpdate = _totalStacked + stackAmount;
        stacker.rewards = new uint256[](_rewardTokens.length);
    }

    function getCurrentRewardSLEV(address wallet)
        private
        view
        returns (uint[] memory)
    {
        return calculateRewards(_stackers[wallet], block.number);
    }

    function getCurrentRewardSLEV(address wallet, address token) private view returns (uint) {
        if (wallet == address(0))
            return 0;
        return calculateReward(_stackers[wallet], block.number, token);
    }

    function getCurrentRewards(address wallet, address token)
        public
        view
        returns (uint)
    {
        uint totalRewardSLEV = getCurrentRewardSLEV(wallet, token);
        if (totalRewardSLEV == 0)
            return 0;
        IUniswapV2Pair pair = IUniswapV2Pair(PancakeswapUtilities.pairFor(_router.factory(), token, address(_SLEV)));
        (uint reservesA, uint reservesB) = PancakeswapUtilities.getReservesOrdered(pair, token, address(_SLEV));
        return _router.quote(totalRewardSLEV, reservesB, reservesA);
    }

    function getStacker(address stackerAddress)
        public
        view
        returns (Stacker memory)
    {
        return _stackers[stackerAddress];
    }

    function getStackedAmount() public view returns(uint256) {
        Stacker memory stacker = _stackers[msg.sender];
        if (stacker.wallet == address(0))
          return 0;
        return _stackers[msg.sender].stackedAmount;
    }
}

struct RewardTokenInfo {
    ERC20 rewardToken;
    uint256 index;
    uint256 SLEVPerBlock;
}

struct Stacker {
    uint256 stackedAmount;
    uint256 lastUpdateBlock;
    uint256 totalStackedOnLastUpdate;
    address wallet;
    uint256[] rewards;
}
