// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SpiderRegistry} from "../src/SpiderRegistry.sol";
import {SpiderSend} from "../src/SpiderSend.sol";

/// @notice Deploys SpiderRegistry (and SpiderSend when SEND_TOKEN is set) and writes deployments/<chainId>.json.
/// Env: PRIVATE_KEY, WRITER (data-layer key address), optional OWNER (defaults to deployer), SEND_TOKEN.
contract Deploy is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address owner = vm.envOr("OWNER", vm.addr(pk));
        address writer = vm.envAddress("WRITER");
        address sendToken = vm.envOr("SEND_TOKEN", address(0));

        vm.startBroadcast(pk);
        SpiderRegistry registry = new SpiderRegistry(owner, writer);
        SpiderSend send = sendToken == address(0) ? SpiderSend(address(0)) : new SpiderSend(registry, IERC20(sendToken));
        vm.stopBroadcast();

        string memory key = "deployment";
        vm.serializeUint(key, "chainId", block.chainid);
        vm.serializeAddress(key, "owner", owner);
        vm.serializeAddress(key, "writer", writer);
        vm.serializeAddress(key, "registry", address(registry));
        vm.serializeAddress(key, "spiderSend", address(send));
        string memory json = vm.serializeAddress(key, "sendToken", sendToken);
        string memory path = string.concat(vm.projectRoot(), "/../deployments/", vm.toString(block.chainid), ".json");
        vm.writeJson(json, path);

        console.log("registry  ", address(registry));
        console.log("spiderSend", address(send));
        console.log("written   ", path);
    }
}
