// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Errors} from "@openzeppelin/contracts/interfaces/draft-IERC6093.sol";
import {SpiderRegistry} from "../src/SpiderRegistry.sol";
import {SpiderSend} from "../src/SpiderSend.sol";
import {ISpiderRegistry} from "../src/interfaces/ISpiderRegistry.sol";
import {SpiderGuardedERC20} from "../examples/SpiderGuardedERC20.sol";

contract TestUSD is ERC20 {
    constructor() ERC20("Test USD", "TUSD") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract GuardedToken is SpiderGuardedERC20 {
    constructor(ISpiderRegistry r) ERC20("Guarded", "GRD") SpiderGuardedERC20(r) {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract SpiderSendTest is Test {
    SpiderRegistry reg;
    TestUSD usd;
    SpiderSend sender;
    address writer = makeAddr("writer");
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");

    event Sent(
        address indexed from, address indexed to, uint256 amount, ISpiderRegistry.Category category, uint8 level
    );

    function setUp() public {
        reg = new SpiderRegistry(address(this), writer);
        usd = new TestUSD();
        sender = new SpiderSend(reg, usd);
        usd.mint(alice, 1_000e6);
        vm.prank(alice);
        usd.approve(address(sender), type(uint256).max);
    }

    function _set(address a, ISpiderRegistry.Category c, uint8 level) internal {
        uint256[] memory e = new uint256[](1);
        e[0] = reg.pack(a, c, level);
        vm.prank(writer);
        reg.setRisk(e);
    }

    function test_SendToCleanAddress() public {
        vm.expectEmit(true, true, false, true);
        emit Sent(alice, bob, 100e6, ISpiderRegistry.Category.NONE, 0);
        vm.prank(alice);
        sender.send(bob, 100e6);
        assertEq(usd.balanceOf(bob), 100e6);
        assertEq(usd.balanceOf(alice), 900e6);
    }

    function test_SendToWarnLevelPassesAndIsRecorded() public {
        _set(bob, ISpiderRegistry.Category.MIXER, 2);
        vm.expectEmit(true, true, false, true);
        emit Sent(alice, bob, 1e6, ISpiderRegistry.Category.MIXER, 2);
        vm.prank(alice);
        sender.send(bob, 1e6);
        assertEq(usd.balanceOf(bob), 1e6);
    }

    function test_SendToSanctionedIsBlocked() public {
        _set(bob, ISpiderRegistry.Category.SANCTIONED, 3);
        vm.expectRevert(
            abi.encodeWithSelector(SpiderSend.Blocked.selector, bob, ISpiderRegistry.Category.SANCTIONED, 3)
        );
        vm.prank(alice);
        sender.send(bob, 1e6);
        assertEq(usd.balanceOf(bob), 0);
    }

    function test_SendFromCriticalSenderIsBlocked() public {
        _set(alice, ISpiderRegistry.Category.EXPLOIT, 3);
        vm.expectRevert(abi.encodeWithSelector(SpiderSend.Blocked.selector, alice, ISpiderRegistry.Category.EXPLOIT, 3));
        vm.prank(alice);
        sender.send(bob, 1e6);
    }

    function test_ZeroAmountReverts() public {
        vm.expectRevert(SpiderSend.ZeroAmount.selector);
        vm.prank(alice);
        sender.send(bob, 0);
    }

    function test_NoAllowanceReverts() public {
        usd.mint(bob, 5e6);
        vm.expectRevert(
            abi.encodeWithSelector(IERC20Errors.ERC20InsufficientAllowance.selector, address(sender), 0, 5e6)
        );
        vm.prank(bob);
        sender.send(alice, 5e6);
    }

    function test_ClearedAddressIsReachableAgain() public {
        _set(bob, ISpiderRegistry.Category.SANCTIONED, 3);
        _set(bob, ISpiderRegistry.Category.SANCTIONED, 0);
        vm.prank(alice);
        sender.send(bob, 1e6);
        assertEq(usd.balanceOf(bob), 1e6);
    }

    function testFuzz_SendRespectsLevelAndHoldsNothing(uint256 amount, uint8 level) public {
        amount = bound(amount, 1, 1_000e6);
        level = uint8(bound(level, 0, 3));
        if (level > 0) _set(bob, ISpiderRegistry.Category.SCAM, level);

        if (level == 3) vm.expectRevert();
        vm.prank(alice);
        sender.send(bob, amount);

        assertEq(usd.balanceOf(bob), level == 3 ? 0 : amount);
        assertEq(usd.balanceOf(address(sender)), 0);
        assertEq(usd.balanceOf(alice) + usd.balanceOf(bob), 1_000e6);
    }

    // ------------------------------------------------------------------ example integration

    function test_GuardedTokenBlocksCriticalParties() public {
        GuardedToken t = new GuardedToken(reg);
        t.mint(alice, 10e18);
        _set(bob, ISpiderRegistry.Category.PHISHING, 3);

        vm.expectRevert(
            abi.encodeWithSelector(SpiderGuardedERC20.Blocked.selector, bob, ISpiderRegistry.Category.PHISHING, 3)
        );
        vm.prank(alice);
        t.transfer(bob, 1e18);

        vm.expectRevert(
            abi.encodeWithSelector(SpiderGuardedERC20.Blocked.selector, bob, ISpiderRegistry.Category.PHISHING, 3)
        );
        t.mint(bob, 1e18);

        vm.prank(alice);
        IERC20(address(t)).transfer(makeAddr("carol"), 1e18);
        assertEq(t.balanceOf(alice), 9e18);
    }
}
