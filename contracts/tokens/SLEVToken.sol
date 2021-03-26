pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "contracts/interfaces/IMintable.sol";
import "contracts/interfaces/IBurnable.sol";
import "contracts/staking/LEVStackingPool.sol";

contract SLEVToken is ERC20, IMintable, IBurnable {
    uint256 _initialSupply;
    LEVStackingPool[] _stackingPools;
    address _minter;

    constructor(address owner, uint256 initialSupply)
        ERC20("Stacked LEV", "SLEV")
    {
        _initialSupply = initialSupply;
        _minter = owner;
        _mint(owner, initialSupply);
    }

    //     address SLEV,
    // address[] memory rewardTokens,
    // uint256[] memory SLEVPerBlock,
    // address[] memory lp

    modifier minterOnly {
        require(_minter == msg.sender, "SLEV: NOT_MINTER");
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

    function setMinter(address newMinter) public minterOnly {
        _minter = newMinter;
    }
}
