import Link from "next/link";

const FEATURES = [
  {
    href: "/register",
    title: "Register IP",
    icon: "📝",
    description:
      "Record your intellectual property on-chain. Immutable, timestamped, and verifiable.",
  },
  {
    href: "/license",
    title: "License IP",
    icon: "🔑",
    description:
      "Issue exclusive or non-exclusive licences with programmable royalties.",
  },
  {
    href: "/trade",
    title: "Trade IP",
    icon: "💱",
    description:
      "List and transfer IP ownership on the Solana marketplace with instant settlement.",
  },
] as const;

export default function HomePage() {
  return (
    <section className="flex flex-col items-center gap-12 pt-12 text-center">
      {/* Hero */}
      <div className="flex flex-col items-center gap-4">
        <span className="rounded-full border border-brand/40 bg-brand/10 px-4 py-1 text-sm font-medium text-brand-light">
          Devnet Preview
        </span>
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
          IP Infrastructure
          <br />
          <span className="text-brand">on Solana</span>
        </h1>
        <p className="max-w-xl text-gray-400">
          Register, license, and trade intellectual property on-chain. Connect
          your wallet to get started.
        </p>
        <Link
          href="/register"
          className="mt-2 rounded-lg bg-brand px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
        >
          Get started →
        </Link>
      </div>

      {/* Feature cards */}
      <div className="grid w-full max-w-4xl grid-cols-1 gap-4 sm:grid-cols-3">
        {FEATURES.map(({ href, title, icon, description }) => (
          <Link
            key={href}
            href={href}
            className="flex flex-col gap-3 rounded-xl border border-surface-border bg-surface-card p-6 text-left transition-colors hover:border-brand/50 hover:bg-brand/5"
          >
            <span className="text-3xl">{icon}</span>
            <h2 className="font-semibold text-white">{title}</h2>
            <p className="text-sm text-gray-400">{description}</p>
          </Link>
        ))}
      </div>

      {/* Network badge */}
      <p className="text-xs text-gray-600">
        Network:{" "}
        <span className="font-mono text-gray-400">
          {process.env.NEXT_PUBLIC_SOLANA_NETWORK ?? "devnet"}
        </span>
      </p>
    </section>
  );
}
