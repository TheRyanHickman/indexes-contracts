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
    IBEP20 immutable _LEV;
    IUniswapV2Router02 private immutable _pancakeRouter;
    IndexPool[] public pools;

    uint256 constant buybackRewardPart = 750;
    uint256 constant devTeamRewardPart = 250;
    address immutable _teamSharing;

    event DeployIndex(address index);
    event RedistributeFees(uint256 amount);

    constructor(
        address __WBNB,
        address LEV,
        address pancakeRouter,
        address teamSharing
    ) {
        _WBNB = IBEP20(__WBNB);
        _LEV = IBEP20(LEV);
        _pancakeRouter = IUniswapV2Router02(pancakeRouter);
        _teamSharing = teamSharing;
    }

    function createIndexPool(
        string memory name,
        string memory symbol,
        address[] memory underlyingTokens,
        uint16[] memory weights,
        uint8[] memory categories
    ) external {
        IndexPool pool =
            new IndexPool(
                name,
                symbol,
                underlyingTokens,
                weights,
                address(_WBNB),
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
    function redistributeFees() external {
        uint256 totalFees = _WBNB.balanceOf(address(this));
        uint256 remainingToRedistribute = totalFees;
        uint256 buybackPart =
            (remainingToRedistribute * buybackRewardPart) / 1000;
        // We buy LEV that we can't spend (=burn)
        _buyLEV(buybackPart, address(this));
        remainingToRedistribute -= buybackPart;
        uint256 devTeamAmount =
            (remainingToRedistribute * devTeamRewardPart) / 1000;
        _WBNB.transfer(_teamSharing, devTeamAmount);
        remainingToRedistribute -= devTeamAmount;
        emit RedistributeFees(totalFees);
    }

    /*
     ** Some of the index purchase fees are used to buy back LEV and reduce the total supply
     */
    function _buyLEV(uint256 amountBNB, address to) private {
        PancakeswapUtilities.sellToken(
            address(_WBNB),
            address(_LEV),
            to,
            amountBNB,
            _pancakeRouter
        );
    }
}
