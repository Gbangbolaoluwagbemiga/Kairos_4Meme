// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/MockUSDC.sol";

contract DeployMockUSDC is Script {
    function run() external returns (address usdc) {
        address admin = vm.envOr("KAIROS_ADMIN", msg.sender);
        vm.startBroadcast();
        MockUSDC token = new MockUSDC(admin);
        vm.stopBroadcast();
        console2.log("MockUSDC deployed at:", address(token));
        return address(token);
    }
}

