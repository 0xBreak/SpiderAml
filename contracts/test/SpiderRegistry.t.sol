// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {SpiderRegistry} from "../src/SpiderRegistry.sol";
import {ISpiderRegistry} from "../src/interfaces/ISpiderRegistry.sol";

contract SpiderRegistryTest is Test {
    SpiderRegistry reg;
    address owner = makeAddr("owner");
    address writer = makeAddr("writer");
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");

    event RiskSet(address indexed account, ISpiderRegistry.Category category, uint8 level);

    function setUp() public {
        reg = new SpiderRegistry(owner, writer);
    }

    function _entry(address a, ISpiderRegistry.Category c, uint8 level) internal pure returns (uint256) {
        return uint256(uint160(a)) | (uint256(uint8(c)) << 160) | (uint256(level) << 168);
    }

    function _set(address a, ISpiderRegistry.Category c, uint8 level) internal {
        uint256[] memory e = new uint256[](1);
        e[0] = _entry(a, c, level);
        vm.prank(writer);
        reg.setRisk(e);
    }

    function _setRaw(uint256 raw) internal {
        uint256[] memory e = new uint256[](1);
        e[0] = raw;
        vm.prank(writer);
        reg.setRisk(e);
    }

    // ------------------------------------------------------------------ setup & roles

    function test_ConstructorSetsOwnerAndWriter() public view {
        assertEq(reg.owner(), owner);
        assertTrue(reg.isWriter(writer));
        assertEq(reg.BLOCK_LEVEL(), 3);
    }

    function test_ConstructorWithoutWriter() public {
        SpiderRegistry r = new SpiderRegistry(owner, address(0));
        assertFalse(r.isWriter(address(0)));
    }

    function test_OnlyWriterCanSet() public {
        uint256[] memory e = new uint256[](1);
        e[0] = _entry(alice, ISpiderRegistry.Category.SCAM, 2);
        vm.expectRevert(SpiderRegistry.NotWriter.selector);
        vm.prank(alice);
        reg.setRisk(e);
    }

    function test_OwnerManagesWriters() public {
        vm.prank(owner);
        reg.setWriter(alice, true);
        assertTrue(reg.isWriter(alice));

        vm.prank(owner);
        reg.setWriter(writer, false);
        assertFalse(reg.isWriter(writer));

        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, alice));
        vm.prank(alice);
        reg.setWriter(bob, true);
    }

    function test_OwnershipTransferIsTwoStep() public {
        vm.prank(owner);
        reg.transferOwnership(alice);
        assertEq(reg.owner(), owner);
        vm.prank(alice);
        reg.acceptOwnership();
        assertEq(reg.owner(), alice);
    }

    // ------------------------------------------------------------------ records

    function test_SetAndReadRecord() public {
        vm.warp(1_700_000_000);
        vm.expectEmit(true, false, false, true);
        emit RiskSet(alice, ISpiderRegistry.Category.SANCTIONED, 3);
        _set(alice, ISpiderRegistry.Category.SANCTIONED, 3);

        (ISpiderRegistry.Category c, uint8 level) = reg.riskOf(alice);
        assertEq(uint8(c), uint8(ISpiderRegistry.Category.SANCTIONED));
        assertEq(level, 3);
        SpiderRegistry.Risk memory r = reg.recordOf(alice);
        assertEq(r.updatedAt, 1_700_000_000);
    }

    function test_UnknownAddressIsClean() public view {
        (ISpiderRegistry.Category c, uint8 level) = reg.riskOf(bob);
        assertEq(uint8(c), 0);
        assertEq(level, 0);
    }

    function test_LevelZeroRemovesRecord() public {
        _set(alice, ISpiderRegistry.Category.PHISHING, 2);
        vm.expectEmit(true, false, false, true);
        emit RiskSet(alice, ISpiderRegistry.Category.NONE, 0);
        _set(alice, ISpiderRegistry.Category.PHISHING, 0);
        SpiderRegistry.Risk memory r = reg.recordOf(alice);
        assertEq(r.level, 0);
        assertEq(uint8(r.category), 0);
        assertEq(r.updatedAt, 0);
    }

    function test_UpdateOverwrites() public {
        _set(alice, ISpiderRegistry.Category.SCAM, 1);
        _set(alice, ISpiderRegistry.Category.EXPLOIT, 3);
        (ISpiderRegistry.Category c, uint8 level) = reg.riskOf(alice);
        assertEq(uint8(c), uint8(ISpiderRegistry.Category.EXPLOIT));
        assertEq(level, 3);
    }

    function test_BatchSetsAll() public {
        uint256[] memory e = new uint256[](3);
        e[0] = _entry(alice, ISpiderRegistry.Category.MIXER, 2);
        e[1] = _entry(bob, ISpiderRegistry.Category.OTHER, 1);
        e[2] = _entry(address(0xBEEF), ISpiderRegistry.Category.SANCTIONED, 3);
        vm.prank(writer);
        reg.setRisk(e);
        (, uint8 la) = reg.riskOf(alice);
        (, uint8 lb) = reg.riskOf(bob);
        (, uint8 lc) = reg.riskOf(address(0xBEEF));
        assertEq(la, 2);
        assertEq(lb, 1);
        assertEq(lc, 3);
    }

    function test_BatchIsAtomic() public {
        uint256[] memory e = new uint256[](2);
        e[0] = _entry(alice, ISpiderRegistry.Category.SCAM, 2);
        e[1] = _entry(bob, ISpiderRegistry.Category.SCAM, 4);
        vm.expectRevert(abi.encodeWithSelector(SpiderRegistry.InvalidLevel.selector, 4));
        vm.prank(writer);
        reg.setRisk(e);
        (, uint8 la) = reg.riskOf(alice);
        assertEq(la, 0);
    }

    // ------------------------------------------------------------------ validation

    function test_RejectsZeroAccount() public {
        vm.expectRevert(SpiderRegistry.InvalidAccount.selector);
        _set(address(0), ISpiderRegistry.Category.SCAM, 2);
    }

    function test_RejectsCategoryNone() public {
        vm.expectRevert(abi.encodeWithSelector(SpiderRegistry.InvalidCategory.selector, 0));
        _set(alice, ISpiderRegistry.Category.NONE, 2);
    }

    function test_RejectsCategoryOutOfRange() public {
        uint256 raw = uint256(uint160(alice)) | (uint256(7) << 160) | (uint256(2) << 168);
        vm.expectRevert(abi.encodeWithSelector(SpiderRegistry.InvalidCategory.selector, 7));
        _setRaw(raw);
    }

    function test_RejectsHighBits() public {
        uint256 raw = _entry(alice, ISpiderRegistry.Category.SCAM, 2) | (uint256(1) << 200);
        vm.expectRevert(abi.encodeWithSelector(SpiderRegistry.MalformedEntry.selector, raw));
        _setRaw(raw);
    }

    function test_PackMatchesLayout() public view {
        assertEq(reg.pack(alice, ISpiderRegistry.Category.MIXER, 2), _entry(alice, ISpiderRegistry.Category.MIXER, 2));
    }

    // ------------------------------------------------------------------ checkTransfer

    function test_CheckTransferBothClean() public view {
        (bool allowed, address worst, ISpiderRegistry.Category c, uint8 level) = reg.checkTransfer(alice, bob);
        assertTrue(allowed);
        assertEq(worst, address(0));
        assertEq(uint8(c), 0);
        assertEq(level, 0);
    }

    function test_CheckTransferPicksRiskierSide() public {
        _set(alice, ISpiderRegistry.Category.SCAM, 1);
        _set(bob, ISpiderRegistry.Category.SANCTIONED, 3);
        (bool allowed, address worst, ISpiderRegistry.Category c, uint8 level) = reg.checkTransfer(alice, bob);
        assertFalse(allowed);
        assertEq(worst, bob);
        assertEq(uint8(c), uint8(ISpiderRegistry.Category.SANCTIONED));
        assertEq(level, 3);
    }

    function test_CheckTransferWarnLevelPasses() public {
        _set(bob, ISpiderRegistry.Category.MIXER, 2);
        (bool allowed, address worst,, uint8 level) = reg.checkTransfer(alice, bob);
        assertTrue(allowed);
        assertEq(worst, bob);
        assertEq(level, 2);
    }

    // ------------------------------------------------------------------ fuzz

    function testFuzz_RoundTrip(address account, uint8 category, uint8 level) public {
        vm.assume(account != address(0));
        category = uint8(bound(category, 1, 6));
        level = uint8(bound(level, 1, 3));
        _set(account, ISpiderRegistry.Category(category), level);
        (ISpiderRegistry.Category c, uint8 l) = reg.riskOf(account);
        assertEq(uint8(c), category);
        assertEq(l, level);
    }

    function testFuzz_InvalidLevelReverts(address account, uint8 level) public {
        vm.assume(account != address(0));
        level = uint8(bound(level, 4, type(uint8).max));
        uint256 raw = uint256(uint160(account)) | (uint256(1) << 160) | (uint256(level) << 168);
        vm.expectRevert(abi.encodeWithSelector(SpiderRegistry.InvalidLevel.selector, level));
        _setRaw(raw);
    }

    function testFuzz_CheckTransferBlocksOnlyCritical(uint8 lf, uint8 lt) public {
        lf = uint8(bound(lf, 0, 3));
        lt = uint8(bound(lt, 0, 3));
        if (lf > 0) _set(alice, ISpiderRegistry.Category.SCAM, lf);
        if (lt > 0) _set(bob, ISpiderRegistry.Category.SCAM, lt);
        (bool allowed,,, uint8 level) = reg.checkTransfer(alice, bob);
        assertEq(level, lf > lt ? lf : lt);
        assertEq(allowed, level < 3);
    }
}
