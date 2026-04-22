import React, { createContext, useContext, useCallback, useEffect, useMemo, useRef, ReactNode } from 'react';
import { toast } from 'sonner';
import { FOURMEME_CHAIN_ID, KAIROS_API_URL } from '@/lib/fourmeme';
import { ethers } from 'ethers';
import { useAppKit, useAppKitAccount, useAppKitNetwork, useAppKitProvider, useDisconnect } from '@reown/appkit/react';

interface WalletContextType {
  isConnected: boolean;
  address: string | null;
  balance: string;
  /** Open Reown (WalletConnect) modal. */
  open: () => void;
  /** Request a signature to prove wallet control (always triggers a popup). */
  signIn: () => Promise<string | null>;
  disconnect: () => Promise<void>;
  refreshBalance: () => void;
  chainOk: boolean;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [balance, setBalance] = React.useState<string>("0.0000");
  const [chainOk, setChainOk] = React.useState<boolean>(true);
  const providerRef = useRef<ethers.BrowserProvider | null>(null);
  const { open } = useAppKit();
  const { disconnect: appKitDisconnect } = useDisconnect();
  const { address, isConnected } = useAppKitAccount();
  const { chainId } = useAppKitNetwork();
  const appKitProvider = useAppKitProvider('eip155');

  // Normalize chainOk from AppKit network
  useEffect(() => {
    if (!chainId) return;
    setChainOk(Number(chainId) === FOURMEME_CHAIN_ID);
  }, [chainId]);

  // Fetch balance from backend
  const failCountRef = useRef(0);
  const refreshBalance = useCallback(async () => {
    if (!address) return;
    try {
      const response = await fetch(`${KAIROS_API_URL}/api/fourmeme/balance/${address}`);
      const data = await response.json();
      if (typeof data?.bnb === 'string') setBalance(data.bnb);
      failCountRef.current = 0; // Reset on success
    } catch (error) {
      failCountRef.current++;
      if (failCountRef.current <= 2) {
        console.warn('[Kairos] Backend unreachable — balance polling paused');
      }
      // Silently fail after first 2 logs to avoid console spam
    }
  }, [address]);

  useEffect(() => {
    if (address) {
      refreshBalance();
      // Poll every 30s instead of 10s to reduce console noise
      const interval = setInterval(refreshBalance, 30000);
      return () => clearInterval(interval);
    }
  }, [address, refreshBalance]);

  const signIn = useCallback(async () => {
    try {
      if (!import.meta.env.VITE_REOWN_PROJECT_ID) {
        toast.error('Missing VITE_REOWN_PROJECT_ID. Add it to your frontend env and restart.');
        return null;
      }
      if (!isConnected) {
        open();
        return null;
      }
      const ethProvider = (appKitProvider as any)?.walletProvider;
      if (!ethProvider) {
        toast.error('Wallet provider not ready. Please reconnect.');
        return null;
      }
      providerRef.current = providerRef.current || new ethers.BrowserProvider(ethProvider);
      const signer = await providerRef.current.getSigner();

      // This always triggers a wallet popup.
      const issuedAt = new Date().toISOString();
      const msg =
        `Kairos Sign-In\n` +
        `Address: ${address}\n` +
        `Issued At: ${issuedAt}\n` +
        `Purpose: prove wallet control to enable agent actions`;
      const sig = await signer.signMessage(msg);
      toast.success('Signed in!');
      return sig;
    } catch (e: any) {
      const msg = String(e?.message || e || '');
      if (msg.toLowerCase().includes('user rejected')) toast.error('Signature rejected');
      else toast.error('Sign-in failed');
      return null;
    }
  }, [address, appKitProvider, isConnected, open]);

  const disconnect = useCallback(async () => {
    try {
      await appKitDisconnect();
    } catch {
      // ignore
    }
    providerRef.current = null;
    setBalance("0.0000");
    toast.info('Signed out');
  }, [appKitDisconnect]);

  const computedAddress = useMemo(() => (address ? String(address) : null), [address]);

  return (
    <WalletContext.Provider value={{
      isConnected: !!computedAddress,
      address: computedAddress,
      balance,
      open,
      signIn,
      disconnect,
      refreshBalance,
      chainOk
    }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}
