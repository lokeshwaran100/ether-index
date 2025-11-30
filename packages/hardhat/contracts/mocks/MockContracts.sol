// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "../IOracle.sol";

contract MockToken is ERC20 {
    uint8 private immutable _decimals;

    constructor(string memory name_, string memory symbol_, uint8 decimals_) ERC20(name_, symbol_) {
        _decimals = decimals_;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function decimals() public view override returns (uint8) {
        return _decimals;
    }
}

contract MockWETH is ERC20("Mock Wrapped Ether", "mWETH") {
    constructor() {}

    function deposit() external payable {
        _mint(msg.sender, msg.value);
    }

    function withdraw(uint256 amount) external {
        _burn(msg.sender, amount);
        (bool success, ) = msg.sender.call{ value: amount }("");
        require(success, "withdraw failed");
    }

    receive() external payable {}
}

contract MockOracle is IOracle {
    mapping(address => uint256) public prices;
    mapping(address => bytes32) public priceIds;

    function setPrice(address token, uint256 price) external {
        prices[token] = price;
    }

    function setPriceFeed(address token, bytes32 priceId) external override {
        priceIds[token] = priceId;
    }

    function getPrice(address token) external view override returns (uint256 price) {
        price = prices[token];
        require(price > 0, "price not set");
    }
}

contract MockRouter {
    address public immutable weth;

    constructor(address wethAddress) {
        weth = wethAddress;
    }

    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256,
        address[] calldata path,
        address to,
        uint256
    ) external returns (uint[] memory amounts) {
        require(path.length == 2, "invalid path");
        ERC20(path[0]).transferFrom(msg.sender, address(this), amountIn);

        if (path[1] == weth) {
            require(ERC20(weth).balanceOf(address(this)) >= amountIn, "router weth balance low");
            ERC20(weth).transfer(to, amountIn);
        } else {
            MockToken(path[1]).mint(to, amountIn);
        }

        amounts = new uint[](2);
        amounts[0] = amountIn;
        amounts[1] = amountIn;
    }
}
