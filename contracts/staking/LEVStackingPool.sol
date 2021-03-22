pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";
import "contracts/tokens/SLEVToken.sol";
import "contracts/tokens/LEVToken.sol";
import "contracts/utilities/PancakeswapUtilities.sol";

contract LEVStackingPool {
    uint256 _totalStacked;
    SLEVToken _SLEV;
    RewardTokenInfo[] _rewardTokens;
    mapping(address => Stacker) _stackers;
    mapping(address => RewardTokenInfo) _rewardTokenMap;

    constructor(
        address SLEV,
        address[] memory rewardTokens,
        uint256[] memory SLEVPerBlock,
        address[] memory lp
    ) {
        require(
            rewardTokens.length == SLEVPerBlock.length,
            "reaward tokens and reward per block arrays must have the same size."
        );
        _SLEV = SLEVToken(SLEV);
        for (uint256 i = 0; i < rewardTokens.length; i++) {
            address rewardTokenAddress = rewardTokens[i];
            ERC20 rewardToken = ERC20(rewardTokenAddress);
            _rewardTokens.push(
                RewardTokenInfo({
                    rewardToken: rewardToken,
                    lp: IUniswapV2Pair(lp[i]),
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

    function calCulateRewards(Stacker storage stacker, uint256 blockNumber)
        private
        view
        returns (uint256[] memory)
    {
        uint256[] memory rewards = new uint256[](_rewardTokens.length);
        for (uint256 i = 0; i < _rewardTokens.length; i++) {
            uint256 SLEVPerBlock = _rewardTokens[i].SLEVPerBlock;
            uint256 blockRewards =
                (blockNumber - stacker.lastUpdateBlock) * SLEVPerBlock;
            rewards[i] = blockRewards * stacker.stackedAmount;
        }
        return rewards;
    }

    function updateRewards(Stacker storage stacker, uint256 blockNumber)
        private
    {
        stacker.rewards = calCulateRewards(stacker, blockNumber);
        stacker.lastUpdateBlock = blockNumber;
        stacker.totalStackedOnLastUpdate = _totalStacked;
    }

    function stack(uint256 stackAmount) public {
        address sender = msg.sender;
        //_stakeToken.transferFrom(sender, address(this), stackAmount);
        Stacker storage stacker = _stackers[sender];
        if (stacker.wallet == address(0))
            initializeStacker(stacker, sender, stackAmount);
        else updateRewards(stacker, block.number);
        _totalStacked += stackAmount;
    }

    function unstack(uint256 amount)
        public
        stackerOnly
        minStackedAmount(amount)
    {
        //_stakeToken.transferFrom(address(this), msg.sender, stackAmount);
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
        _SLEV.mint(stacker.wallet, SLEVAmount);
        PancakeswapUtilities.sellToken(
            address(rewardTokenInfo.rewardToken),
            stacker.wallet,
            SLEVAmount,
            rewardTokenInfo.lp
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

    function getCurrentRewards(address wallet)
        public
        view
        stackerOnly
        returns (RewardToken[] memory)
    {
        uint256[] memory rewards =
            calCulateRewards(_stackers[wallet], block.number);
        RewardToken[] memory rewardsToken =
            new RewardToken[](_rewardTokens.length);
        for (uint256 i = 0; i < _rewardTokens.length; i++) {
            RewardTokenInfo memory rewardTokenInfo = _rewardTokens[i];
            rewardsToken[i].amount = rewards[i] * 0; // find price with lp rewardTokenInfo.lp
            rewardsToken[i].token = address(rewardTokenInfo.rewardToken);
        }
        return rewardsToken;
    }

    function getStacker(address stackerAddress)
        public
        view
        returns (Stacker memory)
    {
        return _stackers[stackerAddress];
    }
}

struct RewardTokenInfo {
    ERC20 rewardToken;
    IUniswapV2Pair lp;
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

struct RewardToken {
    address token;
    uint256 amount;
}
