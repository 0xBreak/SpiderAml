// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ISpiderRegistry} from "./interfaces/ISpiderRegistry.sol";

/// @title SpiderSend
/// @notice Screened transfers of one token: the sender approves this contract once, then `send` checks both
/// parties against the registry and moves the tokens directly from sender to recipient. Critical-level
/// addresses are refused; lower levels go through and are recorded in the event. Holds no funds.
contract SpiderSend {
    using SafeERC20 for IERC20;

    ISpiderRegistry public immutable registry;
    IERC20 public immutable token;

    event Sent(
        address indexed from, address indexed to, uint256 amount, ISpiderRegistry.Category category, uint8 level
    );

    error Blocked(address account, ISpiderRegistry.Category category, uint8 level);
    error ZeroAmount();

    constructor(ISpiderRegistry registry_, IERC20 token_) {
        registry = registry_;
        token = token_;
    }

    function send(address to, uint256 amount) external {
        if (amount == 0) revert ZeroAmount();
        (bool allowed, address worst, ISpiderRegistry.Category category, uint8 level) =
            registry.checkTransfer(msg.sender, to);
        if (!allowed) revert Blocked(worst, category, level);
        token.safeTransferFrom(msg.sender, to, amount);
        emit Sent(msg.sender, to, amount, category, level);
    }
}
