//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "./IndexPool.sol";
import "../interfaces/IBEP20.sol";
import "../utilities/PancakeswapUtilities.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";

contract IndexController {
    string[] CATEGORIES = ["Popular"];
    IBEP20 immutable _BUSD;
    IBEP20 immutable _LEV;
    IBEP20 immutable _SLEV;
    IUniswapV2Router02 private immutable _pancakeRouter;
    IndexPool[] public pools;

    uint256 constant buybackRewardPart = 600;
    uint256 constant devTeamRewardPart = 250;
    uint256 constant stackingRewardPart = 150;
    address immutable _teamSharing;

    event DeployIndex(address index);
    event RedistributeFees(uint256 amount);

    constructor(
        address BUSD,
        address LEV,
        address SLEV,
        address pancakeRouter,
        address teamSharing
    ) {
        _BUSD = IBEP20(BUSD);
        _LEV = IBEP20(LEV);
        _SLEV = IBEP20(SLEV);
        _pancakeRouter = IUniswapV2Router02(pancakeRouter);
        _teamSharing = teamSharing;
    }

    function createIndexPool(
        string memory name,
        string memory symbol,
        address[] memory underlyingTokens,
        uint256[] memory weights,
        uint8[] memory categories
    ) public {
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
        emit DeployIndex(address(pool));
    }

    /*
     ** call this function to automatically dispatch collected fees
     ** - buy back LEV to burn
     ** - reward the dev team
     */
    function redistributeFees() public {
        uint256 totalFees = _BUSD.balanceOf(address(this));
        uint256 remainingToRedistribute = totalFees;
        uint256 buybackPart =
            (remainingToRedistribute * buybackRewardPart) / 1000;
        _burnLEV(buybackPart);
        remainingToRedistribute -= buybackPart;
        uint256 devTeamAmount =
            (remainingToRedistribute * devTeamRewardPart) / 1000;
        _BUSD.transfer(_teamSharing, devTeamAmount);
        remainingToRedistribute -= devTeamAmount;
        // _buyLevForSLEV(remainingToRedistribute); @Matthieu said no
        emit RedistributeFees(totalFees);
    }

    /*
     ** Some of the index purchase fees are used to buy back LEV and reduce the total supply
     */
    function _burnLEV(uint256 amountBUSD) private {
        IUniswapV2Router02 router = IUniswapV2Router02(_pancakeRouter);
        PancakeswapUtilities.sellToken(
            address(_LEV),
            address(_BUSD),
            address(0),
            amountBUSD,
            router
        );
    }

    /*
     ** Some of the index purchase fees are used to buy SLEV in order to reward staking users
     */
    function _buyLevForSLEV(uint256 amountBUSD) private {
        IUniswapV2Router02 router = IUniswapV2Router02(_pancakeRouter);
        PancakeswapUtilities.buyToken(
            address(_BUSD),
            address(_LEV),
            address(this),
            amountBUSD,
            router
        );
        uint256 LEVBalance = _LEV.balanceOf(address(this));

        // burn the SLEV to raise its price against LEV
        PancakeswapUtilities.sellToken(
            address(_SLEV),
            address(_LEV),
            address(0),
            LEVBalance,
            router
        );
    }
}
