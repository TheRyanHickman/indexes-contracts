//SPDX-License-Identifier: Unlicense
pragma solidity 0.8.4;

import "./IndexPool.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
// import "hardhat/console.sol";

/**
 * This is an index controller. It creates new crypto indices and receives fees from
 * the purchase of indices
 */
contract IndexController {
    string[] CATEGORIES = ["Popular"];
    IBEP20 immutable _WBNB;
    IBEP20 immutable _BUSD;
    IBEP20 immutable _LEV;
    IUniswapV2Router02 private immutable _pancakeRouter;
    IndexPool[] public pools;

    uint256 constant buybackRewardPart = 500;
    uint256 constant stakerPart = 250;
    uint256 constant devTeamRewardPart = 250;
    address immutable _teamSharing;
    address immutable _rewardBar;

    event DeployIndex(address index);
    event RedistributeFees(uint256 amount);

    constructor(
        address __WBNB,
        address BUSD,
        address LEV,
        address pancakeRouter,
        address teamSharing,
        address rewardBar
    ) {
        _WBNB = IBEP20(__WBNB);
        _BUSD = IBEP20(BUSD);
        _LEV = IBEP20(LEV);
        _pancakeRouter = IUniswapV2Router02(pancakeRouter);
        _teamSharing = teamSharing;
        _rewardBar = rewardBar;
    }

    function createIndexPool(
        string memory name,
        string memory symbol,
        address[] memory underlyingTokens,
        uint16[] memory weights,
        uint8[] memory categories
    ) external {
        require(weights.length == underlyingTokens.length, "IndexController: ARRAY_SIZE_NOT_EQUAL");
        require(weights.length > 0, "IndexController: MISSING_UNDERLYING_TOKENS");
        IndexPool pool =
            new IndexPool(
                name,
                symbol,
                underlyingTokens,
                weights,
                address(_BUSD),
                address(_pancakeRouter),
                address(this),
                categories
            );
        pools.push(pool);
        pool.transferOwnership(msg.sender);
        emit DeployIndex(address(pool));
    }

    /*
     ** call this function to automatically dispatch collected fees
     ** - buy back LEV to burn
     ** - reward the dev team
     */
    function redistributeFees(IBEP20 token) external {
        uint256 totalFees = token.balanceOf(address(this));
        uint256 remainingToRedistribute = totalFees;
        uint256 buybackPart =
            (remainingToRedistribute * buybackRewardPart) / 1000;
        // We buy LEV that we can't spend (=burn)
        _buyLEV(address(token), buybackPart, address(this));
        remainingToRedistribute -= buybackPart;
        uint256 devTeamAmount =
            (remainingToRedistribute * devTeamRewardPart) / 1000;
        remainingToRedistribute -= devTeamAmount;
        token.transfer(_teamSharing, devTeamAmount);

        if (token != _BUSD)
            convertFeeToBUSD(remainingToRedistribute, _rewardBar);
        else
            _BUSD.transfer(_rewardBar, _BUSD.balanceOf(address(this)));

        emit RedistributeFees(totalFees);
    }

    /*
     ** Some of the index purchase fees are used to buy back LEV and reduce the total supply
     */
    function _buyLEV(address token, uint256 amountBNB, address to) private {
        PancakeswapUtilities.sellToken(
            address(token),
            address(_LEV),
            to,
            amountBNB,
            _pancakeRouter
        );
    }

    function convertFeeToBUSD(uint256 amountIn, address target) private {
        PancakeswapUtilities.sellToken(address(_WBNB), address(_BUSD), target, amountIn, _pancakeRouter);
    }
}
