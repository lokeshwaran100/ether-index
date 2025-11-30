// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@pythnetwork/pyth-sdk-solidity/IPyth.sol";
import "@pythnetwork/pyth-sdk-solidity/PythStructs.sol";
import "./IOracle.sol";

contract PythOracle is IOracle {
    mapping(address => bytes32) public priceIds;
    address public owner;
    IPyth public pyth;

    constructor(address pythContract) {
        require(pythContract != address(0), "Invalid Pyth address");
        owner = msg.sender;
        pyth = IPyth(pythContract);
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not the owner");
        _;
    }

    function setPriceFeed(address token, bytes32 priceId) external override onlyOwner {
        priceIds[token] = priceId;
    }

    /**
     * @dev Pushes fresh prices to Pyth on-chain; caller must provide update data and fee.
     */
    function updatePriceFeeds(bytes[] calldata priceUpdateData) external payable {
        uint256 fee = pyth.getUpdateFee(priceUpdateData);
        pyth.updatePriceFeeds{ value: fee }(priceUpdateData);
    }

    function getPrice(address token) external view override returns (uint256 price) {
        bytes32 priceId = priceIds[token];
        require(priceId != bytes32(0), "Price feed not found");
        PythStructs.Price memory p = pyth.getPriceUnsafe(priceId);
        require(p.price > 0, "Invalid price");
        price = _normalizeTo8Decimals(p.price, p.expo);
    }

    function _normalizeTo8Decimals(int64 priceValue, int32 expo) internal pure returns (uint256) {
        // priceValue represents price * 10^expo; we want uint with 8 decimals (10^-8)
        int256 value = int256(priceValue);
        require(value > 0, "Invalid price");
        int32 expoDiff = expo + 8; // target exponent is -8
        if (expoDiff >= 0) {
            return uint256(value) * (10 ** uint32(uint32(expoDiff)));
        } else {
            return uint256(value) / (10 ** uint32(uint32(-expoDiff)));
        }
    }
}
