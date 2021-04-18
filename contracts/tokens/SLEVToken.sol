// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "contracts/interfaces/IMintable.sol";
import "contracts/interfaces/IBurnable.sol";
import "contracts/staking/StakingPool.sol";

contract SLEVToken is ERC20, IMintable, IBurnable {
    uint256 _initialSupply;
    address[] public _minters;

    constructor(address owner, uint256 initialSupply)
        ERC20("Staked LEV", "SLEV")
    {
        _initialSupply = initialSupply;
        _minters.push(owner);
        _mint(owner, initialSupply);
    }

    modifier minterOnly {
        bool foundMinter = false;
        for (uint i = 0; i < _minters.length; i++) {
            if (_minters[i] == msg.sender)
                foundMinter = true;
        }
        require(foundMinter, "SLEV: NOT_A_MINTER");
        _;
    }

    function mint(address receiver, uint256 amount)
        external
        override
        minterOnly
    {
        return _mint(receiver, amount);
    }

    function burn(uint256 amount) public override {
        _burn(msg.sender, amount);
    }

    function getMinters() external view returns (address[] memory) {
        return _minters;
    }

    function setMinters(address[] memory newMinters) external minterOnly {
        delete _minters;
        for (uint i = 0; i < newMinters.length; i++) {
            _minters.push(newMinters[i]);
        }
    }
}
