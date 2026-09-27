import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Solana wallet adapter requires these transpilation settings
  transpilePackages: [
    "@solana/wallet-adapter-base",
    "@solana/wallet-adapter-react",
    "@solana/wallet-adapter-react-ui",
    "@solana/wallet-adapter-wallets",
  ],
};

export default nextConfig;
