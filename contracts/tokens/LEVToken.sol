// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "contracts/interfaces/IBurnable.sol";
import "contracts/utilities/PancakeswapUtilities.sol";
import "contracts/tokens/SLEVToken.sol";

contract LEVToken is ERC20, IBurnable {
    uint256 _createdAtBlock;
    uint256 _initialSupply;
    uint256 _mintPerBlock;
    IUniswapV2Pair _LevSlevLP;
    SLEVToken _SLev;
    address _pancakeRouter;

    constructor(
        address owner,
        uint256 initialSupply,
        uint256 mintPerBlock,
        address SLev,
        address levSlevLP,
        address pancakeRouter
    ) ERC20("Levyathan", "LEV") {
        _mint(owner, initialSupply);
        _mintPerBlock = mintPerBlock;
        _LevSlevLP = IUniswapV2Pair(levSlevLP);
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

    function buySLEV() public {
        address thisAddress = address(this);
        PancakeswapUtilities.sellToken(
            thisAddress,
            address(_SLev),
            thisAddress,
            balanceOf(thisAddress),
            IUniswapV2Router02(_pancakeRouter)
        );
        _SLev.burn(_SLev.balanceOf(thisAddress));
    }

    function burn(uint256 amount) public override {
        _burn(msg.sender, amount);
    }
}
