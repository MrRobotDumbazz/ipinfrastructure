"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import WalletButton from "./WalletButton";
import ApiStatusIndicator from "./ApiStatusIndicator";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/register", label: "Register IP" },
  { href: "/license", label: "License" },
  { href: "/trade", label: "Trade" },
] as const;

/**
 * Top navigation bar.
 * Active route is highlighted. Backend API status indicator & Wallet connect on the right.
 */
export default function NavBar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-surface-border bg-surface/90 backdrop-blur">
      <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        {/* Logo */}
        <Link
          href="/"
          className="text-lg font-bold tracking-tight text-brand hover:text-brand-light transition-colors"
        >
          IP Infrastructure
        </Link>

        {/* Links */}
        <ul className="flex items-center gap-1">
          {NAV_LINKS.map(({ href, label }) => {
            const isActive =
              href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={[
                    "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-brand/20 text-brand-light"
                      : "text-gray-400 hover:bg-surface-card hover:text-white",
                  ].join(" ")}
                >
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Controls: API Health Status + Wallet */}
        <div className="flex items-center gap-3">
          <ApiStatusIndicator />
          <WalletButton />
        </div>
      </nav>
    </header>
  );
}
