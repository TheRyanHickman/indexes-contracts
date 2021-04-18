import "contracts/staking/SLEVToken.sol";
import "contracts/staking/StakingPool.sol";

contract StakingPoolController {
    address constant UNISWAP_ROUTER = 0x05fF2B0DB69458A0750badebc4f9e13aDd608C7F;
    SLEVToken _SLEV;
    IUniswapV2Router02 _router;

    constructor() {
        _SLEV = new SLEVToken(address(this), 0);
        _router = IUniswapV2Router02(UNISWAP_ROUTER);
    }

    function deployStackingPool(
        address stakeToken, 
        address[] memory rewardTokens,
        uint256[] memory multiplier) external  {
        StakingPool pool = new StakingPool(address(_SLEV), stakeToken, rewardTokens, multiplier, _router);
        _SLEV.addMinter(address(pool));
    }

}