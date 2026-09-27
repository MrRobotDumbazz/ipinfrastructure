"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { MOCK_IP_ASSETS, type IpAsset } from "@/lib/mocks";

// MOCK (B2) — simulate register submission; replace with API call per contracts/openapi.yaml

function IpTypeSelect({
  value,
  onChange,
}: {
  value: IpAsset["type"];
  onChange: (v: IpAsset["type"]) => void;
}) {
  const options: { value: IpAsset["type"]; label: string }[] = [
    { value: "patent", label: "Patent" },
    { value: "copyright", label: "Copyright" },
    { value: "trademark", label: "Trademark" },
  ];
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as IpAsset["type"])}
      className="w-full rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm text-white focus:border-brand focus:outline-none"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export default function RegisterPage() {
  const { connected, publicKey } = useWallet();
  const [title, setTitle] = useState("");
  const [ipType, setIpType] = useState<IpAsset["type"]>("patent");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  // MOCK (B2): simulated submission
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!connected || !publicKey) return;
    setSubmitting(true);
    setResult(null);
    await new Promise((r) => setTimeout(r, 800)); // simulate network
    setResult(`[MOCK] IP "${title}" registered. Fake tx: 5abc...${Date.now().toString(36)}`);
    setSubmitting(false);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-2 text-2xl font-bold">Register IP</h1>
      <p className="mb-6 text-sm text-gray-400">
        Record intellectual property on-chain. Data displayed below is from{" "}
        <span className="font-mono text-brand-light">mocks.ts</span> (B2 —
        contract not yet populated).
      </p>

      {/* Registration form */}
      <form
        onSubmit={handleSubmit}
        className="mb-8 flex flex-col gap-4 rounded-xl border border-surface-border bg-surface-card p-6"
      >
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium uppercase text-gray-500">
            Title
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="My invention title…"
            className="rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-brand focus:outline-none"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium uppercase text-gray-500">
            IP Type
          </label>
          <IpTypeSelect value={ipType} onChange={setIpType} />
        </div>

        {!connected && (
          <p className="text-sm text-yellow-400">
            Connect your wallet to register.
          </p>
        )}

        <button
          type="submit"
          disabled={!connected || submitting}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Registering…" : "Register on-chain"}
        </button>

        {result && (
          <p className="rounded-lg border border-green-700 bg-green-900/30 p-3 text-xs text-green-400">
            {result}
          </p>
        )}
      </form>

      {/* Mock asset list */}
      <h2 className="mb-3 text-lg font-semibold">
        Registered Assets{" "}
        <span className="text-xs font-normal text-gray-500">[MOCK B2]</span>
      </h2>
      <ul className="flex flex-col gap-3">
        {MOCK_IP_ASSETS.map((asset) => (
          <li
            key={asset.id}
            className="rounded-xl border border-surface-border bg-surface-card p-4"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-white">{asset.title}</p>
                <p className="mt-0.5 text-xs text-gray-500">
                  {asset.type} · {asset.registeredAt.slice(0, 10)}
                </p>
              </div>
              <span className="rounded bg-brand/20 px-2 py-0.5 text-xs font-mono text-brand-light">
                {asset.txSignature}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
