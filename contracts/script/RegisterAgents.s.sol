// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/AgentRegistry.sol";
import "../src/SpendingPolicy.sol";

contract RegisterAgents is Script {
    function run() external {
        // Accept either the contracts-local env vars or the app env vars (easier wiring).
        address registryAddr = vm.envOr("KAIROS_AGENT_REGISTRY", address(0));
        if (registryAddr == address(0)) {
            registryAddr = vm.envOr("KAIROS_AGENT_REGISTRY_EVM_ADDRESS", address(0));
        }
        // Final fallback: known deployed address on BNB testnet (chainId 97) from this repo’s Deploy run.
        if (registryAddr == address(0)) {
            registryAddr = 0x7e7b5dbaE3aDb3D94a27DCfB383bDB98667145E6;
        }

        address policyAddr = vm.envOr("KAIROS_SPENDING_POLICY", address(0));
        if (policyAddr == address(0)) {
            policyAddr = vm.envOr("KAIROS_SPENDING_POLICY_EVM_ADDRESS", address(0));
        }
        if (policyAddr == address(0)) {
            policyAddr = 0x3f00dB811A4Ab36e7a953a9C9bC841499fC2EAF6;
        }

        AgentRegistry registry = AgentRegistry(registryAddr);
        SpendingPolicy policy = policyAddr == address(0) ? SpendingPolicy(address(0)) : SpendingPolicy(policyAddr);

        // Default per-task price (native BNB) in wei.
        uint256 priceWei = vm.envOr("KAIROS_DEFAULT_AGENT_PRICE_WEI", uint256(1e15)); // 0.001 BNB
        uint256 dailyLimitWei = vm.envOr("KAIROS_DEFAULT_DAILY_LIMIT_WEI", uint256(0));

        // If you didn't set per-agent owners, default all payouts to the admin (or deployer).
        address admin = vm.envOr("KAIROS_ADMIN", msg.sender);

        vm.startBroadcast();
        _reg(registry, "oracle", vm.envOr("ORACLE_OWNER", admin), "Price Oracle", "price", priceWei);
        _reg(registry, "news", vm.envOr("NEWS_OWNER", admin), "News Scout", "news", priceWei);
        _reg(registry, "yield", vm.envOr("YIELD_OWNER", admin), "Yield Optimizer", "yield", priceWei);
        _reg(registry, "tokenomics", vm.envOr("TOKENOMICS_OWNER", admin), "Tokenomics Analyzer", "tokenomics", priceWei);
        _reg(registry, "perp", vm.envOr("PERP_OWNER", admin), "Perp Stats", "perp", priceWei);
        _reg(registry, "protocol", vm.envOr("PROTOCOL_OWNER", admin), "Protocol Stats", "protocol", priceWei);
        _reg(registry, "bridges", vm.envOr("BRIDGES_OWNER", admin), "Bridge Monitor", "bridges", priceWei);
        _reg(registry, "dex-volumes", vm.envOr("DEX_VOLUMES_OWNER", admin), "DEX Volumes", "dex-volumes", priceWei);
        _reg(registry, "chain-scout", vm.envOr("CHAIN_SCOUT_OWNER", admin), "Chain Scout", "chain-scout", priceWei);

        if (policyAddr != address(0) && dailyLimitWei > 0) {
            policy.setDailyLimit(keccak256(bytes("oracle")), dailyLimitWei);
        }
        vm.stopBroadcast();
    }

    function _reg(
        AgentRegistry registry,
        string memory key,
        address owner,
        string memory name,
        string memory serviceType,
        uint256 priceWei
    ) internal {
        bytes32 k = keccak256(bytes(key));
        // Try register; if exists, update.
        try registry.registerAgent(k, owner, name, serviceType, priceWei) {}
        catch {
            registry.updateAgent(k, owner, priceWei, true);
        }
    }
}

