"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { MOCK_IP_ASSETS, MOCK_LICENSES } from "@/lib/mocks";

// MOCK (B2) — replace with API calls per contracts/openapi.yaml once populated

export default function LicensePage() {
  const { connected } = useWallet();
  const [selectedIp, setSelectedIp] = useState(MOCK_IP_ASSETS[0]?.id ?? "");
  const [licenseType, setLicenseType] = useState<"exclusive" | "non-exclusive">(
    "non-exclusive"
  );
  const [royaltyBps, setRoyaltyBps] = useState(500);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!connected) return;
    setSubmitting(true);
    setResult(null);
    await new Promise((r) => setTimeout(r, 800));
    setResult(
      `[MOCK] License issued for ${selectedIp} (${licenseType}, ${royaltyBps / 100}% royalty). Fake tx: 5abc...${Date.now().toString(36)}`
    );
    setSubmitting(false);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-2 text-2xl font-bold">License IP</h1>
      <p className="mb-6 text-sm text-gray-400">
        Issue a licence for a registered IP asset. Data from{" "}
        <span className="font-mono text-brand-light">mocks.ts</span> (B2).
      </p>

      {/* License form */}
      <form
        onSubmit={handleSubmit}
        className="mb-8 flex flex-col gap-4 rounded-xl border border-surface-border bg-surface-card p-6"
      >
        {/* IP selector */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium uppercase text-gray-500">
            IP Asset
          </label>
          <select
            value={selectedIp}
            onChange={(e) => setSelectedIp(e.target.value)}
            className="w-full rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm text-white focus:border-brand focus:outline-none"
          >
            {MOCK_IP_ASSETS.map((a) => (
              <option key={a.id} value={a.id}>
                {a.title}
              </option>
            ))}
          </select>
        </div>

        {/* License type */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium uppercase text-gray-500">
            Licence Type
          </label>
          <div className="flex gap-3">
            {(["non-exclusive", "exclusive"] as const).map((t) => (
              <label key={t} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="licenseType"
                  value={t}
                  checked={licenseType === t}
                  onChange={() => setLicenseType(t)}
                  className="accent-brand"
                />
                <span className="text-sm capitalize text-white">{t}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Royalty */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium uppercase text-gray-500">
            Royalty — {royaltyBps / 100}%
          </label>
          <input
            type="range"
            min={0}
            max={5000}
            step={50}
            value={royaltyBps}
            onChange={(e) => setRoyaltyBps(Number(e.target.value))}
            className="accent-brand"
          />
        </div>

        {!connected && (
          <p className="text-sm text-yellow-400">Connect wallet to issue licence.</p>
        )}

        <button
          type="submit"
          disabled={!connected || submitting}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Issuing…" : "Issue licence"}
        </button>

        {result && (
          <p className="rounded-lg border border-green-700 bg-green-900/30 p-3 text-xs text-green-400">
            {result}
          </p>
        )}
      </form>

      {/* Existing licenses */}
      <h2 className="mb-3 text-lg font-semibold">
        Active Licences{" "}
        <span className="text-xs font-normal text-gray-500">[MOCK B2]</span>
      </h2>
      <ul className="flex flex-col gap-3">
        {MOCK_LICENSES.map((lic) => (
          <li
            key={lic.id}
            className="rounded-xl border border-surface-border bg-surface-card p-4"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-white">
                  {MOCK_IP_ASSETS.find((a) => a.id === lic.ipAssetId)?.title ??
                    lic.ipAssetId}
                </p>
                <p className="mt-0.5 text-xs text-gray-500">
                  {lic.licenseType} · {lic.royaltyBps / 100}% royalty ·
                  expires {lic.expiresAt ? lic.expiresAt.slice(0, 10) : "never"}
                </p>
              </div>
              <span className="rounded bg-brand/20 px-2 py-0.5 text-xs font-mono text-brand-light">
                {lic.txSignature}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
