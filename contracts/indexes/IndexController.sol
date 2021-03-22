//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "./IndexPool.sol";
import "../interfaces/IBEP20.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";

contract IndexController {

    string[] CATEGORIES = ["foo", "bar"];
    IBEP20 constant BUSD = IBEP20(address(0)); // TODO
    IBEP20 constant LEV = IBEP20(address(0)); // TODO
    IBEP20 constant SLEV = IBEP20(address(0)); // TODO
    address constant PANCAKE_ROUTER = address(0); // TODO
    address constant PANCKAE_FACTORY = address(0); // TODO
    IndexPool[] pools;

    uint constant buybackRewardPercent = 60;
    uint constant devTeamRewardPercent = 25;
    uint constant stackingRewardPercent = 15;
    address constant teamSharing = address(0); // TODO

    constructor() {
        // ETH, UNI, LINK, YFI, COMP, INJ
        address[] memory DEITokens = new address[](1);
        DEITokens[0] = msg.sender; // TODO: use proper addresses
        uint[] memory DEIWeights = new uint[](1);
        DEIWeights[0] = 1;
        uint8[] memory categories = new uint8[](1);
        categories[0] = 0;

        IndexPool pool = new IndexPool(
            "DeFIETHIndex",
            "DEI",
            DEITokens,
            DEIWeights,
            address(BUSD),
            PANCAKE_ROUTER,
            PANCKAE_FACTORY,
            address(this),
            categories
        );
        pools.push(pool);
    }

    /*
    ** call this function to automatically dispatch collected fees
    ** - buy back LEV to burn
    ** - reward the dev team
    */
    function redistributeFees() public {
        uint balanceBUSD = BUSD.balanceOf(address(this));
        uint buybackPart = (balanceBUSD * buybackRewardPercent) / 100;
        _burnLEV(buybackPart);
        balanceBUSD -= buybackPart;
        uint devTeamPart = (balanceBUSD * devTeamRewardPercent) / 100;
        BUSD.transfer(teamSharing, devTeamPart);
        balanceBUSD -= devTeamPart;
        _buyLevForSLEV(balanceBUSD);
        // TODO: emit Event
    }

    /*
    ** Some of the index purchase fees are used to buy back LEV and reduce the total supply
    */
    function _burnLEV(uint amountBUSD) private {
        address[] memory tokensBUSDLEV = new address[](2);
        tokensBUSDLEV[0] = address(BUSD);
        tokensBUSDLEV[1] = address(LEV);
        // TODO: implement that stuff. Buy LEV from the pancake LP, and send it to address(0)
        IUniswapV2Router02 router = IUniswapV2Router02(PANCAKE_ROUTER);
        router.swapExactTokensForTokens(amountBUSD, 0, tokensBUSDLEV, address(0), block.timestamp + 100);
    }

    /*
    ** Some of the index purchase fees are used to buy SLEV in order to reward staking users
    */
    function _buyLevForSLEV(uint amountBUSD) private {
        IUniswapV2Router02 router = IUniswapV2Router02(PANCAKE_ROUTER);
        address[] memory tokensBUSDLEV = new address[](2);
        tokensBUSDLEV[0] = address(BUSD);
        tokensBUSDLEV[1] = address(LEV);
        router.swapExactTokensForTokens(amountBUSD, 0, tokensBUSDLEV, address(this), block.timestamp + 100);
        uint LEVBalance = LEV.balanceOf(address(this));
        // burn the SLEV to raise its price against LEV
        address[] memory tokensBUSDSLEV = new address[](2);
        tokensBUSDSLEV[0] = address(BUSD);
        tokensBUSDSLEV[1] = address(SLEV);
        router.swapExactTokensForTokens(LEVBalance, 0, tokensBUSDSLEV, address(0), block.timestamp + 100);// is timestmap really necessary? Unlikely
    }
}