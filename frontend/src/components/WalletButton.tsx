"use client";

import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

/**
 * Thin wrapper around the wallet-adapter-react-ui WalletMultiButton.
 * Handles connect / disconnect / account display automatically.
 */
export default function WalletButton() {
  return (
    <WalletMultiButton
      style={{
        background: "var(--wallet-btn-bg, #9945FF)",
        borderRadius: "8px",
        fontSize: "14px",
        fontWeight: 600,
        height: "40px",
        padding: "0 16px",
      }}
    />
  );
}
