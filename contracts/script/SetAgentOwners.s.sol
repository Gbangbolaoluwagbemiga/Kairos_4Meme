// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/AgentRegistry.sol";

/// @notice Set each agent's owner to its own EVM agent wallet address.
/// Keeps existing priceWei + active flag from the registry.
contract SetAgentOwners is Script {
    function run() external {
        address registryAddr = vm.envOr("KAIROS_AGENT_REGISTRY", address(0));
        if (registryAddr == address(0)) registryAddr = vm.envOr("KAIROS_AGENT_REGISTRY_EVM_ADDRESS", address(0));
        if (registryAddr == address(0)) registryAddr = 0x7e7b5dbaE3aDb3D94a27DCfB383bDB98667145E6;

        AgentRegistry registry = AgentRegistry(registryAddr);

        // Pull agent wallet addresses from env.
        // These are PUBLIC addresses only (safe to store in env / docs).
        address oracle = vm.envAddress("ORACLE_EVM_ADDRESS");
        address news = vm.envAddress("NEWS_EVM_ADDRESS");
        address yield = vm.envAddress("YIELD_EVM_ADDRESS");
        address tokenomics = vm.envAddress("TOKENOMICS_EVM_ADDRESS");
        address perp = vm.envAddress("PERP_EVM_ADDRESS");
        address protocol = vm.envAddress("PROTOCOL_EVM_ADDRESS");
        address bridges = vm.envAddress("BRIDGES_EVM_ADDRESS");
        address dex = vm.envAddress("DEX_VOLUMES_EVM_ADDRESS");
        address scout = vm.envAddress("CHAIN_SCOUT_EVM_ADDRESS");

        vm.startBroadcast();
        _set(registry, "oracle", oracle);
        _set(registry, "news", news);
        _set(registry, "yield", yield);
        _set(registry, "tokenomics", tokenomics);
        _set(registry, "perp", perp);
        _set(registry, "protocol", protocol);
        _set(registry, "bridges", bridges);
        _set(registry, "dex-volumes", dex);
        _set(registry, "chain-scout", scout);
        vm.stopBroadcast();
    }

    function _set(AgentRegistry registry, string memory key, address newOwner) internal {
        bytes32 k = keccak256(bytes(key));
        AgentRegistry.Agent memory a = registry.getAgent(k);
        registry.updateAgent(k, newOwner, a.priceWei, a.active);
        console2.log("updated owner:", key, newOwner);
    }
}

