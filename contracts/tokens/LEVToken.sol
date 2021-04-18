// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "contracts/interfaces/IBurnable.sol";
import "contracts/utilities/PancakeswapUtilities.sol";
import "contracts/staking/SLEVToken.sol";

contract LEVToken is ERC20, IBurnable {
    uint256 _createdAtBlock;
    uint256 _initialSupply;
    uint256 _mintPerBlock;
    SLEVToken _SLev;
    address _pancakeRouter;
    address _teamSharing;

    uint constant teamPart = 10;
    uint constant treasuryPart = 10;
    uint constant stakingPart = 80; 

    constructor(
        address owner,
        uint256 initialSupply,
        uint256 mintPerBlock,
        address SLev,
        address pancakeRouter,
        address teamSharing
    ) ERC20("Levyathan", "LEV") {
        _mint(owner, initialSupply);
        _initialSupply = initialSupply;
        _mintPerBlock = mintPerBlock;
        _SLev = SLEVToken(SLev);
        _createdAtBlock = block.number;
        _pancakeRouter = pancakeRouter;
        _teamSharing = teamSharing;
    }

    function updateTotalSupply() external {
        uint256 expectedTotalSupply =
            _mintPerBlock * (block.number - _createdAtBlock) + _initialSupply;
        uint256 missingQuantity = expectedTotalSupply - totalSupply();
        _mint(address(this), missingQuantity);
        redistributeMintedAmount();
    }

    function redistributeMintedAmount() internal {
        uint amountToRedistribute = balanceOf(address(this));
        uint devTeamAmount = (amountToRedistribute * (teamPart + treasuryPart)) / 100;

        // 20% of the minted LEV is sent to the dev team + treasury contract
        _transfer(address(this), _teamSharing, devTeamAmount);
        amountToRedistribute -= devTeamAmount;

        // 80% of the minted LEV is sent to the staking users (via buying SLEV staking token)
        buySLEVForBurn(amountToRedistribute);
    }

    function buySLEVForBurn(uint amountToSell) public {
        address thisAddress = address(this);
        PancakeswapUtilities.sellToken(
            thisAddress,
            address(_SLev),
            _pancakeRouter, // burning the SLEV to router. Pair doesn't accept address(0)
            amountToSell,
            IUniswapV2Router02(_pancakeRouter)
        );
    }

    function burn(uint256 amount) external override {
        _burn(msg.sender, amount);
    }

    function getCreatedAtBlock() external view returns(uint) {
        return _createdAtBlock;
    }
}
