pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "contracts/IMintable.sol";
import "contracts/IBurnable.sol";
import "contracts/LEVStackingPool.sol";

contract SLEVToken is ERC20, IMintable, IBurnable {
    uint256 _initialSupply;
    LEVStackingPool[] _stackingPools;
    mapping(address => bool) _minters;

    constructor(address owner, uint256 initialSupply)
        ERC20("Stacked LEV", "SLEV")
    {
        _initialSupply = initialSupply;
        _mint(owner, initialSupply);
    }

    //     address SLEV,
    // address[] memory rewardTokens,
    // uint256[] memory SLEVPerBlock,
    // address[] memory lp

    modifier mintersOnly {
        require(_minters[msg.sender], "Only allowed minters.");
        _;
    }

    function mint(address receiver, uint256 amount)
        external
        override
        mintersOnly
    {
        return _mint(receiver, amount);
    }

    function burn(uint256 amount) public override {
        _burn(msg.sender, amount);
    }
}
