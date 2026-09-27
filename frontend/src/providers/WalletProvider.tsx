"use client";

import React, { useMemo } from "react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-wallets";
import { clusterApiUrl } from "@solana/web3.js";

// Import default Solana wallet adapter styles
import "@solana/wallet-adapter-react-ui/styles.css";

/**
 * Solana Wallet Adapter provider.
 *
 * Network is controlled by NEXT_PUBLIC_SOLANA_NETWORK env variable (.env.example).
 * Defaults to devnet for safe development iteration.
 *
 * Supported wallets: Phantom. Add others via their individual adapter packages.
 * BackpackWalletAdapter was removed from @solana/wallet-adapter-wallets in newer versions.
 */

type SolanaNetwork = "devnet" | "testnet" | "mainnet-beta";

function toWalletAdapterNetwork(n: SolanaNetwork): WalletAdapterNetwork {
  switch (n) {
    case "mainnet-beta":
      return WalletAdapterNetwork.Mainnet;
    case "testnet":
      return WalletAdapterNetwork.Testnet;
    default:
      return WalletAdapterNetwork.Devnet;
  }
}

const rawNetwork =
  (process.env.NEXT_PUBLIC_SOLANA_NETWORK as SolanaNetwork | undefined) ??
  "devnet";

export default function AppWalletProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const network = toWalletAdapterNetwork(rawNetwork);
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      // Add more adapters here (e.g. from their individual packages) when needed
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
