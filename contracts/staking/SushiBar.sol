// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "contracts/interfaces/IMintable.sol";
import "contracts/interfaces/IBurnable.sol";

import "hardhat/console.sol";

/**
 * This is forked from Sushiswap, hence the name "SushiBar". Masterchef owns it
 */

// SushiBar is the coolest bar in town. You come in with some Sushi, and leave with more! The longer you stay, the more Sushi you get.
//
// This contract handles swapping to and from xSushi, SushiSwap's staking token.
contract RewardBar is ERC20, IMintable, Ownable {
    IERC20 immutable public lev;

    // Define the Sushi token contract
    constructor(IERC20 _lev) ERC20("Staked LEV", "SLEV") {
        lev = _lev;
    }

    // Enter the bar. Pay some SUSHIs. Earn some shares.
    // Locks Sushi and mints xSushi
    function enter(uint256 _amount) public {
        // Gets the amount of Sushi locked in the contract
        uint256 totalSushi = lev.balanceOf(address(this));
        // Gets the amount of xSushi in existence
        uint256 totalShares = totalSupply();
        // If no xSushi exists, mint it 1:1 to the amount put in
        if (totalShares == 0 || totalSushi == 0) {
            _mint(msg.sender, _amount);
        } 
        // Calculate and mint the amount of xSushi the Sushi is worth. The ratio will change overtime, as xSushi is burned/minted and Sushi deposited + gained from fees / withdrawn.
        else {
            uint256 what = _amount * totalShares / totalSushi;
            _mint(msg.sender, what);
        }
        // Lock the Sushi in the contract
        lev.transferFrom(msg.sender, address(this), _amount);
    }

    // Leave the bar. Claim back your SUSHIs.
    // Unlocks the staked + gained Sushi and burns xSushi
    function leave(address account, uint256 _share) public {
        require(account == tx.origin, "SushiBar: UNAUTHORIZED");
        // Gets the amount of xSushi in existence
        uint256 totalShares = totalSupply();
        // Calculates the amount of Sushi the xSushi is worth
        uint256 what = _share * lev.balanceOf(address(this)) / totalShares;
        _burn(account, _share);
        lev.transfer(account, what);
    }

    function mint(address receiver, uint256 amount) override external onlyOwner {
        _mint(receiver, amount);
    }

    function burn(address account, uint256 amount) external onlyOwner {
        _burn(account, amount);
    }

    // Safe cake transfer function, just in case if rounding error causes pool to not have enough CAKEs.
    function safeCakeTransfer(address _to, uint256 _amount) public onlyOwner {
        safeTokenTransfer(_to, _amount, lev);
    }

    // Safe busd transfer function, just in case if rounding error causes pool to not have enough CAKEs.
    function safeTokenTransfer(address _to, uint256 _amount, IERC20 _token) public onlyOwner {
        uint256 bal = _token.balanceOf(address(this));
        if (_amount > bal) {
            _token.transfer(_to, bal);
        } else {
            _token.transfer(_to, _amount);
        }
    }
}
