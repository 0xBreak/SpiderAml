// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Read side of the SpiderAML risk registry, for integrating contracts.
/// Level: 0 = no record, 1 = low, 2 = elevated, 3 = critical (integrations should block).
interface ISpiderRegistry {
    enum Category {
        NONE,
        SANCTIONED,
        EXPLOIT,
        PHISHING,
        SCAM,
        MIXER,
        OTHER
    }

    function BLOCK_LEVEL() external view returns (uint8);

    function riskOf(address account) external view returns (Category category, uint8 level);

    /// @notice Would a transfer between `from` and `to` pass? Reports the riskier of the two.
    function checkTransfer(address from, address to)
        external
        view
        returns (bool allowed, address worst, Category category, uint8 level);
}
