// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ISpiderRegistry} from "../src/interfaces/ISpiderRegistry.sol";

/// @notice Example integration: an ERC-20 that screens both parties of every transfer, mint and burn.
/// Not part of the main deployment; shows how a token issuer would wire in the registry.
abstract contract SpiderGuardedERC20 is ERC20 {
    ISpiderRegistry public immutable registry;

    error Blocked(address account, ISpiderRegistry.Category category, uint8 level);

    constructor(ISpiderRegistry registry_) {
        registry = registry_;
    }

    function _update(address from, address to, uint256 value) internal virtual override {
        (bool allowed, address worst, ISpiderRegistry.Category category, uint8 level) = registry.checkTransfer(from, to);
        if (!allowed) revert Blocked(worst, category, level);
        super._update(from, to, value);
    }
}
