import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AppWalletProvider from "@/providers/WalletProvider";
import NavBar from "@/components/NavBar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "IP Infrastructure",
  description: "Decentralised IP registration, licensing, and trading on Solana",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.className} min-h-screen bg-surface text-white antialiased`}
      >
        <AppWalletProvider>
          <NavBar />
          <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
        </AppWalletProvider>
      </body>
    </html>
  );
}
