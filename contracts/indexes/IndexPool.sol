//SPDX-License-Identifier: Unlicense
pragma solidity 0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";

import "contracts/utilities/PancakeswapUtilities.sol";
import "contracts/tokens/WBNB.sol";

import "./IndexController.sol";

// import "hardhat/console.sol";

/**
This is a crypto index contract. It is create by the IndexController
Tracks a group of cryptocurrencies prices. You can purchase this ERC20 and
sell it for the price of the tokens it's tracking. It's like buying an ETF.
*/
contract IndexPool is ERC20, Ownable, ReentrancyGuard {
    address private immutable _indexController;
    WBNB private immutable _WBNB;
    IUniswapV2Router02 private _pancakeRouter;
    IUniswapV2Factory private _pancakeFactory;
    ERC20 private immutable _BUSD;
    address[] _underlyingTokens;
    uint16[] _tokenWeights;
    uint16 WEIGHT_FACTOR = 1000;
    uint8[] _categories;

    event Mint(address indexed to, uint256 amount, uint256 cost);
    event Burn(address indexed from, uint256 amount, uint256 paid);
    event CompositionChange(address[] tokens, uint16[] weights);

    constructor(
        string memory name,
        string memory symbol,
        address[] memory underlyingTokens,
        uint16[] memory tokenWeights,
        address BUSD,
        address router,
        address indexController,
        uint8[] memory categories
    ) ERC20(name, symbol) {
        require(
            tokenWeights.length == underlyingTokens.length,
            "Tokens and weights don't have same sizes"
        );
        require(
            underlyingTokens.length >= 2,
            "At least 2 underlying tokens are needed"
        );

        _underlyingTokens = underlyingTokens;
        _BUSD = ERC20(BUSD);
        _pancakeRouter = IUniswapV2Router02(router);
        _WBNB = WBNB(_pancakeRouter.WETH());
        _pancakeFactory = IUniswapV2Factory(_pancakeRouter.factory());
        _tokenWeights = tokenWeights;
        _indexController = indexController;
        _categories = categories;

        emit CompositionChange(underlyingTokens, tokenWeights);
    }

    /*
    ** purchase at least amountOut of the index paying with a BEP20 token
    */
    function buyIndexWith(uint amountOut, address paymentToken, uint amountInMax) external {
        require(paymentToken == address(_WBNB) || paymentToken == address(_BUSD), "IndexPool: INVALID_PAYMENT_TOKEN");
        uint quote = getIndexQuote(amountOut);
        ERC20(paymentToken).transferFrom(msg.sender, address(this), amountInMax);
        _collectFee(amountInMax / 100, paymentToken);
        (, uint spent) = PancakeswapUtilities.buyToken(paymentToken, address(_WBNB), address(this), quote, _pancakeRouter);
        require(spent <= amountInMax, "IndexPool: INSUFFICIENT_AMOUNT_IN_MAX");
        _buyIndex(amountOut, quote);
    }

    /*
    ** purchase at least amountOut of the index paying with BNB
    */
    function buyIndex(uint amountOut) external payable {
        uint quote = getIndexQuoteWithFee(amountOut);
        uint amountIn = msg.value;
        require(quote <= amountIn, "IndexPool: INSUFFICIENT_AMOUNT_IN");
        _WBNB.deposit{value: quote}();
        (bool sent,) = msg.sender.call{ value: amountIn - quote }("");
        require(sent, "IndexPool: BNB_REFUND_FAIL");
        uint256 remainingWBNB = _buyIndex(amountOut, quote);
        _collectFee(remainingWBNB, address(_WBNB));
    }

    function _buyIndex(uint256 amountOut, uint256 amountIn) private nonReentrant returns (uint256) {
        uint256 totalTokensBought = 0;
        uint totalSpent = 0;
        for (uint256 i = 0; i < _underlyingTokens.length; i++) {
            uint purchaseAmount = (amountOut * _tokenWeights[i]) / WEIGHT_FACTOR;
            if (_underlyingTokens[i] == address(_WBNB)) {
                totalTokensBought += purchaseAmount;
                totalSpent += purchaseAmount;
                continue;
            }
            (uint256 boughtAmount, uint256 spent) =
                PancakeswapUtilities.buyToken(
                    address(_WBNB),
                    _underlyingTokens[i],
                    address(this),
                    purchaseAmount,
                    _pancakeRouter
                );
            totalTokensBought += boughtAmount;
            totalSpent += spent;
        }

        uint256 amountOutResult = (totalTokensBought * WEIGHT_FACTOR) / _sum(_tokenWeights);

        _mint(msg.sender, amountOutResult);
        emit Mint(msg.sender, amountOutResult, totalSpent);
        return amountIn - totalSpent;
    }

    function sellIndex(uint amount, uint amountOutMin) external nonReentrant returns(uint) {
        require(amount <= balanceOf(msg.sender), "IndexPool: INSUFFICIENT_BALANCE");

        uint256 totalTokensSold = 0;
        uint256 amountToPayUser = 0;

        for (uint256 i = 0; i < _underlyingTokens.length; i++) {
            uint256 sellAmount = (amount * _tokenWeights[i]) / WEIGHT_FACTOR;
            if (_underlyingTokens[i] == address(_WBNB)) {
                totalTokensSold += sellAmount;
                amountToPayUser += sellAmount;
                continue;
            }
            (uint256 amountOut, uint256 amountIn) =
                PancakeswapUtilities.sellToken(
                    _underlyingTokens[i],
                    address(_WBNB),
                    address(this),
                    sellAmount,
                    _pancakeRouter
                );

            totalTokensSold += amountIn;
            amountToPayUser += amountOut;
        }
        uint256 amountToBurn = (totalTokensSold * WEIGHT_FACTOR) / _sum(_tokenWeights);
        uint fee = getFee(amountToPayUser);
        _collectFee(fee, address(_WBNB));

        amountToPayUser -= fee;
        _WBNB.withdraw(amountToPayUser);

        _burn(msg.sender, amountToBurn);

        (bool sent,) = msg.sender.call{ value: amountToPayUser }("");
        require(sent, "IndexPool: SEND_BNB_FAIL");
        emit Burn(msg.sender, amountToBurn, amountToPayUser);

        require(amountToPayUser >= amountOutMin, "IndexPool: AMOUNT_OUT_TOO_LOW");
        return amountToPayUser;
    }

    receive() external payable {
    }

    // get the total price of the index in BNB (from Pancakeswap)
    function getIndexQuote(uint amount) public view returns (uint256) {
        uint256 total = 0;
        for (uint256 i = 0; i < _underlyingTokens.length; i++) {
            uint tokenBuyAmount = (_tokenWeights[i] * amount) / WEIGHT_FACTOR;
            total += getTokenQuote(_underlyingTokens[i], tokenBuyAmount);
        }
        return total;
    }

    function getIndexQuoteWithFee(uint amount) public view returns (uint256) {
        uint price = getIndexQuote(amount);
        return price + getFee(price);
    }

    function getFee(uint amount) public pure returns (uint) {
        return amount / 100; // 1% fee
    }

    // get the price of a token in BNB (from Pancakeswap)
    function getTokenQuote(address token, uint amount) public view returns (uint256) {
        if (token == address(_WBNB))
            return amount;
        address pairAddr = _pancakeFactory.getPair(address(_WBNB), token);
        require(pairAddr != address(0), "Cannot find pair BNB-token");
        IUniswapV2Pair pair = IUniswapV2Pair(pairAddr);
        (uint256 reserveBNB, uint256 reserveToken) =
            PancakeswapUtilities.getReservesOrdered(
                pair,
                address(_WBNB),
                token
            );
        return _pancakeRouter.getAmountIn(amount, reserveBNB, reserveToken);
    }

    function getComposition()
        public
        view
        returns (address[] memory, uint16[] memory)
    {
        return (_underlyingTokens, _tokenWeights);
    }

    function _sum(uint16[] memory items) private pure returns (uint16) {
        uint16 total = 0;
        for (uint256 i = 0; i < items.length; i++) {
            total += items[i];
        }
        return total;
    }

    function _collectFee(uint256 amount, address token) private {
        // external calls to trusted contracts
        ERC20(token).transfer(_indexController, amount);
        IndexController(_indexController).redistributeFees(IBEP20(token));
    }

    function changeWeights(uint16[] memory weights) external onlyOwner {
        int quoteBefore = int(getIndexQuote(1e18));
        uint totalSale = 0;
        for (uint i = 0; i < weights.length; i++) {
            if (weights[i] < _tokenWeights[i]) {
                uint sellAmount = (totalSupply() * uint(_tokenWeights[i] - weights[i])) / WEIGHT_FACTOR;
                if (_underlyingTokens[i] != address(_WBNB))
                    PancakeswapUtilities.sellToken(
                        _underlyingTokens[i],
                        address(_WBNB),
                        address(this),
                        sellAmount,
                        _pancakeRouter
                    );
                totalSale += sellAmount;
           }
        }
        uint totalSpent = 0;
        for (uint i = 0; i < weights.length; i++) {
            if (weights[i] > _tokenWeights[i]) {
                uint256 buyAmount = (totalSupply() * uint(weights[i] - _tokenWeights[i])) / WEIGHT_FACTOR;
                if (_underlyingTokens[i] == address(_WBNB)) {
                    totalSpent += buyAmount;
                    continue;
                }
                PancakeswapUtilities.buyToken(
                    _underlyingTokens[i],
                    address(_WBNB),
                    address(this),
                    buyAmount,
                    _pancakeRouter
                );
                totalSpent += buyAmount; 
            }
        }
        _tokenWeights = weights;
        int quoteAfter = int(getIndexQuote(1e18));
        require(
            quoteBefore - quoteAfter > 0 && quoteBefore - quoteAfter < quoteBefore / 50,
            "IndexPool: PRICE_LOSS_TOO_HIGH"
        );
    }

    /*
    ** If something's wrong with the LPs or anything else, anyone can
    ** withdraw the index underlying tokens directly to their wallets
    */
    function emergencyWithdraw() external {
        uint userBalance = this.balanceOf(msg.sender);

        for (uint i = 0; i < _underlyingTokens.length; i++) {
            uint entitledAmount = userBalance * _tokenWeights[i] / WEIGHT_FACTOR;
            ERC20 token = ERC20(_underlyingTokens[i]);
            uint indexBalance = token.balanceOf(address(this));
            // should never happen!
            if (indexBalance < entitledAmount)
                entitledAmount = indexBalance;
            token.transfer(msg.sender, entitledAmount);
        }
        _burn(msg.sender, userBalance);
    }
}
