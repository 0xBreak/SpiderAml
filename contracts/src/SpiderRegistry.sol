// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable, Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {ISpiderRegistry} from "./interfaces/ISpiderRegistry.sol";

/// @title SpiderRegistry
/// @notice On-chain mirror of the SpiderAML risk data: address -> (category, level). Nothing else.
/// The off-chain data layer decides what goes in and pushes it here in batches through a writer key;
/// sources and evidence stay off-chain.
contract SpiderRegistry is ISpiderRegistry, Ownable2Step {
    uint8 public constant BLOCK_LEVEL = 3;
    uint8 internal constant MAX_CATEGORY = uint8(type(Category).max);

    /// @dev One slot per address.
    struct Risk {
        Category category;
        uint8 level;
        uint40 updatedAt;
    }

    mapping(address => Risk) internal _risk;
    mapping(address => bool) public isWriter;

    event RiskSet(address indexed account, Category category, uint8 level);
    event WriterSet(address indexed writer, bool allowed);

    error NotWriter();
    error MalformedEntry(uint256 entry);
    error InvalidAccount();
    error InvalidCategory(uint8 category);
    error InvalidLevel(uint8 level);

    modifier onlyWriter() {
        if (!isWriter[msg.sender]) revert NotWriter();
        _;
    }

    constructor(address owner_, address writer_) Ownable(owner_) {
        if (writer_ != address(0)) _setWriter(writer_, true);
    }

    // ------------------------------------------------------------------ writes

    /// @notice Set or update many records. Each entry packs one record into a word to keep calldata small:
    /// bits 0-159 account, 160-167 category, 168-175 level. Level 0 removes the record.
    function setRisk(uint256[] calldata entries) external onlyWriter {
        uint40 now_ = uint40(block.timestamp);
        for (uint256 i; i < entries.length; ++i) {
            uint256 e = entries[i];
            address account = address(uint160(e));
            uint8 category = uint8(e >> 160);
            uint8 level = uint8(e >> 168);

            if (e >> 176 != 0) revert MalformedEntry(e);
            if (account == address(0)) revert InvalidAccount();
            if (level > BLOCK_LEVEL) revert InvalidLevel(level);
            if (level == 0) {
                delete _risk[account];
                emit RiskSet(account, Category.NONE, 0);
                continue;
            }
            if (category == 0 || category > MAX_CATEGORY) revert InvalidCategory(category);
            _risk[account] = Risk(Category(category), level, now_);
            emit RiskSet(account, Category(category), level);
        }
    }

    function setWriter(address writer, bool allowed) external onlyOwner {
        _setWriter(writer, allowed);
    }

    function _setWriter(address writer, bool allowed) internal {
        isWriter[writer] = allowed;
        emit WriterSet(writer, allowed);
    }

    // ------------------------------------------------------------------ reads

    function riskOf(address account) public view returns (Category category, uint8 level) {
        Risk storage r = _risk[account];
        return (r.category, r.level);
    }

    function recordOf(address account) external view returns (Risk memory) {
        return _risk[account];
    }

    function checkTransfer(address from, address to)
        external
        view
        returns (bool allowed, address worst, Category category, uint8 level)
    {
        (Category cf, uint8 lf) = riskOf(from);
        (Category ct, uint8 lt) = riskOf(to);
        (worst, category, level) = lf >= lt ? (from, cf, lf) : (to, ct, lt);
        if (level == 0) worst = address(0);
        allowed = level < BLOCK_LEVEL;
    }

    /// @notice Off-chain helper for building `setRisk` entries.
    function pack(address account, Category category, uint8 level) external pure returns (uint256) {
        return uint256(uint160(account)) | (uint256(uint8(category)) << 160) | (uint256(level) << 168);
    }
}
