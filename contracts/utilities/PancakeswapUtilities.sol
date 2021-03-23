//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "contracts/interfaces/IBEP20.sol";
import "hardhat/console.sol";

library PancakeswapUtilities {

    // returns sorted token addresses, used to handle return values from pairs sorted in this order
    function sortTokens(address tokenA, address tokenB) internal pure returns (address token0, address token1) {
        require(tokenA != tokenB, 'UniswapV2Library: IDENTICAL_ADDRESSES');
        (token0, token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        require(token0 != address(0), 'UniswapV2Library: ZERO_ADDRESS');
    }

    // calculates the CREATE2 address for a pair without making any external calls
    function pairFor(address factory, address tokenA, address tokenB) internal pure returns (address) {
        (address token0, address token1) = sortTokens(tokenA, tokenB);
        return address(uint160(uint256(keccak256(abi.encodePacked(
                hex'ff',
                factory,
                keccak256(abi.encodePacked(token0, token1)),
                hex'96e8ac4277198ff8b6f785478aa9a39f403cb768dd02cbee326c3e7da348845f' // init code hash
            )))));
    }

    function getAmountOut(
        uint256 amountIn,
        uint256 reserveIn,
        uint256 reserveOut
    ) public pure returns (uint256 amountOut) {
        require(amountIn > 0, "UniswapV2Library: INSUFFICIENT_INPUT_AMOUNT");
        require(
            reserveIn > 0 && reserveOut > 0,
            "UniswapV2Library: INSUFFICIENT_LIQUIDITY"
        );
        uint256 amountInWithFee = amountIn * 997;
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = reserveIn * 1000 + amountInWithFee;
        amountOut = numerator / denominator;
    }

       // given an output amount of an asset and pair reserves, returns a required input amount of the other asset
    function getAmountIn(uint amountOut, uint reserveIn, uint reserveOut) internal pure returns (uint amountIn) {
        require(amountOut > 0, 'UniswapV2Library: INSUFFICIENT_OUTPUT_AMOUNT');
        require(reserveIn > 0 && reserveOut > 0, 'UniswapV2Library: INSUFFICIENT_LIQUIDITY');
        uint numerator = reserveIn * amountOut;
        uint denominator = reserveOut - amountOut;
        amountIn = numerator / denominator + 1;
    }


    function buyToken(address tokenToSpend, address tokenToBuy, address account, uint256 amountOut, IUniswapV2Router02 pancakeRouter) public returns(uint256, uint256) {
      IUniswapV2Pair pair = _getPair(tokenToSpend, tokenToBuy, pancakeRouter.factory());
      (uint reservesA, uint reservesB) = getReservesOrdered(pair, tokenToSpend, tokenToBuy);
      uint amountInMax = (getAmountIn(amountOut, reservesA, reservesB) * 1020) / 1000;
      IBEP20(tokenToSpend).approve(address(pancakeRouter), amountInMax);
      address[] memory path = new address[](2);
      path[0] = tokenToSpend;
      path[1] = tokenToBuy;
      uint[] memory amounts = pancakeRouter.swapTokensForExactTokens(
          amountOut,
          amountInMax,
          path,
          account,
          block.timestamp + 60
      );
      return (amounts[1], amounts[0]);
    }
  
    function sellToken(address tokenToSell, address paymentToken, address account, uint256 amountIn, IUniswapV2Router02 pancakeRouter) public returns(uint256, uint256) {
      IUniswapV2Pair pair = _getPair(paymentToken, tokenToSell, pancakeRouter.factory());
      (uint reservesA, uint reservesB) = getReservesOrdered(pair, paymentToken, tokenToSell);
      IBEP20(tokenToSell).approve(address(pancakeRouter), amountIn);
      address[] memory path = new address[](2);
      path[0] = tokenToSell;
      path[1] = paymentToken;
      uint[] memory amounts = pancakeRouter.swapExactTokensForTokens(
          amountIn,
          0,
          path,
          account,
          block.timestamp + 60
      );
      return (amounts[1], amounts[0]);
    }

    // finds and returns the pair BSUD-[token]
    function _getPair(address tokenA, address tokenB, address pancakeFactory) private view returns(IUniswapV2Pair) {
      return IUniswapV2Pair(PancakeswapUtilities.pairFor(pancakeFactory, tokenA, tokenB));
    }

    function getReservesOrdered(IUniswapV2Pair pair, address tokenFirst, address tokenSecond) public view returns(uint, uint) {
      (address token0,) = PancakeswapUtilities.sortTokens(tokenFirst, tokenSecond);
      (uint tokenAReserve, uint tokenBReserve,) = pair.getReserves();
      return address(tokenFirst) == token0 ? (tokenAReserve, tokenBReserve) : (tokenBReserve, tokenAReserve);
    }
}