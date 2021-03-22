//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "hardhat/console.sol";
import "contracts/utilities/PancakeswapUtilities.sol";


contract IndexPool is ERC20 {

  uint256 constant POOL_FEES = 1e16; // 1% fees
  address private immutable _indexController;
  IUniswapV2Router02 private _pancakeRouter;
  IUniswapV2Factory private _pancakeFactory;
  ERC20 private immutable _BUSD;
  address[] _underlyingTokens;
  uint256[] _targetWeights;
  uint8[] _categories;

  constructor(
    string memory name,
    string memory symbol,
    address[] memory underlyingTokens,
    uint256[] memory targetWeights,
    address BUSD,
    address router,
    address factory,
    address indexController,
    uint8[] memory categories
  ) ERC20(name, symbol) {
    require(targetWeights.length == underlyingTokens.length, "Tokens and weights don't have same sizes");
    require(underlyingTokens.length >= 2, "At least 2 underlying tokens are needed");

    _underlyingTokens = underlyingTokens;
    _BUSD = ERC20(BUSD);
    _pancakeRouter = IUniswapV2Router02(router);
    _pancakeFactory = IUniswapV2Factory(factory);
    _targetWeights = targetWeights;
    _indexController = indexController;
    _categories = categories;
  }

  function mint(uint256 BUSDIn, uint256 minAmountOut) public {
    _BUSD.transferFrom(msg.sender, address(this), BUSDIn);

    uint256 total = 0;
    uint256 totalSpent = 0;
    for (uint i = 0; i < _underlyingTokens.length; i++) {
      (uint256 boughtAmount, uint256 spent) = _buyToken(_underlyingTokens[i], minAmountOut * _targetWeights[i]);
      total += boughtAmount;
      totalSpent += spent;
    }

    uint256 amountOut = total / _sum(_targetWeights);
    require(minAmountOut >= amountOut, "Min amount out is higher than actual amount bought");
    _mint(msg.sender, amountOut);
    totalSpent += _collectFee(totalSpent);
    // refund the extra BUSD
    _BUSD.transfer(msg.sender, BUSDIn - totalSpent);
    // TODO: send event maybe?
  }

  function burn(uint256 amount) public {
    require(amount <= balanceOf(msg.sender), "Insufficient balance");

    uint256 totalTokenSold = 0;
    uint256 userIncome = 0;

    for (uint i = 0; i < _underlyingTokens.length; i++) {
      uint256 sellAmount = (amount * _targetWeights[i]);
      (uint256 amountOut, uint256 amountIn) = _sellToken(_underlyingTokens[i], sellAmount);
      totalTokenSold += amountIn;
      userIncome += amountOut;
    }
    uint256 totalAmountOut = totalTokenSold / _sum(_targetWeights);
    userIncome -= _collectFee(userIncome);
    _BUSD.transfer(msg.sender, userIncome);
    _burn(msg.sender, totalAmountOut);
    // TODO: need an event maybe
  }

  function getPoolPriceBUSD() public view returns (uint256) {
    uint256 total = 0;
    for (uint256 i = 0; i < _underlyingTokens.length; i++) {
      total += getTokenPriceBUSD(_underlyingTokens[i]) * _targetWeights[i];
    }
    return total;
  }

  // TODO: take into account swap fee
  function getTokenPriceBUSD(address token) public view returns (uint256) {
    address pairBUSDAddr = _pancakeFactory.getPair(address(_BUSD), token);
    require(pairBUSDAddr != address(0), "Cannot find pair BUSD-token");
    IUniswapV2Pair pairBUSD = IUniswapV2Pair(pairBUSDAddr);
    (uint256 reserveBUSD, uint256 reserveToken,) = pairBUSD.getReserves();
    return _pancakeRouter.quote(1e18, reserveToken, reserveBUSD);
  }

  function _buyToken(address token, uint256 amountOut) private returns(uint256, uint256) {
    IUniswapV2Pair pair = _getPairForToken(token);
    (uint reservesA, uint reservesB, ) = pair.getReserves();
    uint amountIn = _pancakeRouter.getAmountIn(amountOut, reservesA, reservesB);
    _BUSD.transfer(address(pair), amountIn);
    pair.swap(0, amountOut, address(this), "");
    return (amountOut, amountIn);
  }

  function _sellToken(address token, uint256 amountIn) private returns(uint256, uint256) {
    IUniswapV2Pair pair = _getPairForToken(token);
    (uint reservesA, uint reservesB, ) = pair.getReserves();
    uint amountOut = _pancakeRouter.getAmountOut(amountIn, reservesB, reservesA);
    ERC20(token).transfer(address(pair), amountIn);
    pair.swap(amountOut, 0, address(this), "");
    return (amountOut, amountIn);
  }

  function _sum(uint256[] memory items) private pure returns (uint256) {
    uint256 total = 0;
    for (uint i = 0; i < items.length; i++) {
      total += items[i];
    }
    return total;
  }

  // finds and returns the pair BSUD-[token]
  function _getPairForToken(address token) private view returns(IUniswapV2Pair) {
    return IUniswapV2Pair(PancakeswapUtilities.pairFor(address(_pancakeFactory), address(_BUSD), token));
  }

  function _collectFee(uint256 amount) private returns(uint256) {
    uint256 fee = (amount * POOL_FEES) / 1e18;
    _BUSD.transfer(_indexController, fee);
    return fee;
  }
}
