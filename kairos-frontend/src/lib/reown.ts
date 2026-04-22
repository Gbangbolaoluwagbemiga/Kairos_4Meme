import { createAppKit } from "@reown/appkit/react";
import { EthersAdapter } from "@reown/appkit-adapter-ethers";
import { bscTestnet } from "@reown/appkit/networks";

const projectId = import.meta.env.VITE_REOWN_PROJECT_ID as string | undefined;

// This module must be imported exactly once at app startup.
export function initReownAppKit() {
  // IMPORTANT: AppKit hooks crash if createAppKit() was never called.
  // So we always initialize it. If the projectId is missing, we use a dummy id;
  // the UI will surface the real config error when trying to connect.
  const pid = (projectId || "").trim() || "00000000000000000000000000000000";

  createAppKit({
    adapters: [new EthersAdapter()],
    networks: [bscTestnet],
    projectId: pid,
    metadata: {
      name: "Kairos",
      description: "Four.meme AI Sprint — on-chain agent receipts demo",
      url: window.location.origin,
      icons: [],
    },
  });
}

