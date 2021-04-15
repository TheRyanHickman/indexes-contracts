//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "./utilities/PancakeswapUtilities.sol";
import "./team/TokenSharing.sol";
import "./tokens/SLEVToken.sol";
import "./indexes/IndexController.sol";
import "./interfaces/IBEP20.sol";

// this contract deploys every contract for the Levyathan project
contract DeployAll {

    event DeployContract(string name, address addr);

    address constant _BUSD = 0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56; 
    address constant _PANCAKE_ROUTER = 0x05fF2B0DB69458A0750badebc4f9e13aDd608C7F; 
    address constant _WBNB = 0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c;

    uint constant initialLevSlevLiquidity = 10000e18;

    address immutable _SLEV;
    address immutable _tokenSharing;
    address immutable _LEV;

    constructor() {
        address SLEV = deploySLEV(address(this));
        address tokenSharing = deployTokenSharing(address(this), SLEV);
        address LEV = deployLEV(address(this), SLEV, tokenSharing);
        _SLEV = SLEV;
        _tokenSharing = tokenSharing;
        _LEV = LEV;
    }

    function deployTokenSharing(address owner, address SLEV) internal returns (address tokenSharing) {
        address[] memory tokens = new address[](2);
        tokens[0] = SLEV;
        tokens[1] = _BUSD;
        tokenSharing = address(new TokenSharing(owner, tokens));
        emit DeployContract("TokenSharing", tokenSharing);
    }

    // SLEV is our staking reward token
    function deploySLEV(address initialSupplyOwner) internal returns (address SLEV) {
        uint initialSupply = 100000e18;
        SLEV = address(new SLEVToken(initialSupplyOwner, initialSupply));
        emit DeployContract("SLEV", SLEV);
    }

    // LEV is our governance token
    function deployLEV(address initialSupplyOwner, address SLEV, address tokenSharing) internal returns (address LEV) {
        uint initialSupply = 100000e18;
        LEV = address(new LEVToken(initialSupplyOwner, initialSupply, 40e18, SLEV, _PANCAKE_ROUTER, tokenSharing));
        emit DeployContract("LEV", LEV);
    }

    function deployLiquidityPool(address tokenA, uint amountA, address tokenB, uint amountB, address owner)
        internal returns (address) {
        IUniswapV2Router02 router = IUniswapV2Router02(_PANCAKE_ROUTER);
        IUniswapV2Factory factory = IUniswapV2Factory(router.factory());
        address pair = factory.createPair(tokenA, tokenB);
        IBEP20 BEPtokenA = IBEP20(tokenA);
        IBEP20 BEPtokenB = IBEP20(tokenB);
        BEPtokenA.approve(_PANCAKE_ROUTER, amountA);
        BEPtokenB.approve(_PANCAKE_ROUTER, amountB);
        router.addLiquidity(tokenA, tokenB, amountA, amountB, amountA, amountB, owner, 0);
        return pair;
    }
}