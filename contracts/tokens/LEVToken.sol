// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "contracts/interfaces/IBurnable.sol";
import "contracts/utilities/PancakeswapUtilities.sol";
import "contracts/tokens/SLEVToken.sol";

contract LEVToken is ERC20, IBurnable {
    uint256 _createdAtBlock;
    uint256 _initialSupply;
    uint256 _mintPerBlock;
    SLEVToken _SLev;
    address _pancakeRouter;

    /*
        10% pour la team
        10% en trésorerie
        70% pour les utilisateurs qui stake les tokens LP
        10% pour les utilisateurs qui stake du LEV 
    */

    constructor(
        address owner,
        uint256 initialSupply,
        uint256 mintPerBlock,
        address SLev,
        address pancakeRouter
    ) ERC20("Levyathan", "LEV") {
        _mint(owner, initialSupply);
        _initialSupply = initialSupply;
        _mintPerBlock = mintPerBlock;
        _SLev = SLEVToken(SLev);
        _createdAtBlock = block.number;
        _pancakeRouter = pancakeRouter;
    }

    function updateTotalSupply() public {
        uint256 expectedTotalSupply =
            _mintPerBlock * (block.number - _createdAtBlock) + _initialSupply;
        uint256 missingQuantity = expectedTotalSupply - totalSupply();
        _mint(address(this), missingQuantity);
    }

    function buySLEVForBurn() public {
        address thisAddress = address(this);
        PancakeswapUtilities.sellToken(
            thisAddress,
            address(_SLev),
            _pancakeRouter, // burning the coin to router. Pair doesn't accept address(0)
            balanceOf(thisAddress),
            IUniswapV2Router02(_pancakeRouter)
        );
    }

    function burn(uint256 amount) public override {
        _burn(msg.sender, amount);
    }
}
