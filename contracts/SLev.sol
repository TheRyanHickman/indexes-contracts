pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "contracts/IERC20Mintable.sol";
import "contracts/IERC20Burnable.sol";

contract SLevToken is ERC20, IERC20Mintable, IERC20Burnable {
    uint256 _initialSupply;
    mapping(address => bool) _minters;

    constructor(
        address owner,
        uint256 initialSupply,
        address[] memory minters
    ) ERC20("Stacked LEV", "SLEV") {
        _initialSupply = initialSupply;
        _mint(owner, initialSupply);
        for (uint256 i = 0; i < minters.length; i++)
            _minters[minters[i]] = true;
    }

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
