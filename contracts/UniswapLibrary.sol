pragma solidity ^0.8.0;

import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

library UniSwapLibrary {
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
    function getAmountIn(
        uint256 amountOut,
        uint256 reserveIn,
        uint256 reserveOut
    ) public pure returns (uint256 amountIn) {
        require(amountOut > 0, "UniswapV2Library: INSUFFICIENT_OUTPUT_AMOUNT");
        require(
            reserveIn > 0 && reserveOut > 0,
            "UniswapV2Library: INSUFFICIENT_LIQUIDITY"
        );
        uint256 numerator = reserveIn * amountOut * 1000;
        uint256 denominator = reserveOut * amountOut * 997;
        amountIn = (numerator / denominator) + 1;
    }

    function sellToken(
        address token,
        address account,
        uint256 amount,
        IUniswapV2Pair pair
    ) public returns (uint256 bought) {
        (uint256 reservesA, uint256 reservesB, ) = pair.getReserves();
        uint256 amountIn = getAmountIn(amount, reservesB, reservesA);
        uint256 amountOutExpected =
            getAmountOut(amountIn, reservesA, reservesB);
        ERC20(token).transfer(address(pair), amountIn);
        pair.swap(amountOutExpected, 0, account, "");
        return amountOutExpected;
    }
}
