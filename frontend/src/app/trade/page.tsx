"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { MOCK_IP_ASSETS, MOCK_TRADES } from "@/lib/mocks";

// MOCK (B2) — replace with API calls per contracts/openapi.yaml once populated

const STATUS_COLOUR: Record<string, string> = {
  open: "text-yellow-400 bg-yellow-900/20 border-yellow-700/40",
  completed: "text-green-400 bg-green-900/20 border-green-700/40",
  cancelled: "text-red-400 bg-red-900/20 border-red-700/40",
};

export default function TradePage() {
  const { connected } = useWallet();
  const [selectedIp, setSelectedIp] = useState(MOCK_IP_ASSETS[0]?.id ?? "");
  const [priceSol, setPriceSol] = useState("1");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handleList(e: React.FormEvent) {
    e.preventDefault();
    if (!connected) return;
    setSubmitting(true);
    setResult(null);
    await new Promise((r) => setTimeout(r, 800));
    setResult(
      `[MOCK] Listed ${selectedIp} for ${priceSol} SOL. Fake tx: 5abc...${Date.now().toString(36)}`
    );
    setSubmitting(false);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-2 text-2xl font-bold">Trade IP</h1>
      <p className="mb-6 text-sm text-gray-400">
        List IP assets for sale or purchase. Data from{" "}
        <span className="font-mono text-brand-light">mocks.ts</span> (B2).
      </p>

      {/* List for sale */}
      <form
        onSubmit={handleList}
        className="mb-8 flex flex-col gap-4 rounded-xl border border-surface-border bg-surface-card p-6"
      >
        <h2 className="font-semibold text-white">List for sale</h2>

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

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium uppercase text-gray-500">
            Price (SOL)
          </label>
          <input
            type="number"
            min="0.001"
            step="0.001"
            required
            value={priceSol}
            onChange={(e) => setPriceSol(e.target.value)}
            className="rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm text-white focus:border-brand focus:outline-none"
          />
        </div>

        {!connected && (
          <p className="text-sm text-yellow-400">Connect wallet to list.</p>
        )}

        <button
          type="submit"
          disabled={!connected || submitting}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Listing…" : "List for sale"}
        </button>

        {result && (
          <p className="rounded-lg border border-green-700 bg-green-900/30 p-3 text-xs text-green-400">
            {result}
          </p>
        )}
      </form>

      {/* Active trades */}
      <h2 className="mb-3 text-lg font-semibold">
        Marketplace{" "}
        <span className="text-xs font-normal text-gray-500">[MOCK B2]</span>
      </h2>
      <ul className="flex flex-col gap-3">
        {MOCK_TRADES.map((trade) => (
          <li
            key={trade.id}
            className="rounded-xl border border-surface-border bg-surface-card p-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="font-medium text-white">
                  {MOCK_IP_ASSETS.find((a) => a.id === trade.ipAssetId)
                    ?.title ?? trade.ipAssetId}
                </p>
                <p className="mt-0.5 text-xs text-gray-500">
                  Seller: {trade.seller}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="text-sm font-bold text-white">
                  {trade.priceInSol} SOL
                </span>
                <span
                  className={`rounded border px-2 py-0.5 text-xs font-medium ${STATUS_COLOUR[trade.status]}`}
                >
                  {trade.status}
                </span>
              </div>
            </div>
            {trade.status === "open" && connected && (
              <button
                onClick={() => alert("[MOCK B2] Buy flow not yet implemented")}
                className="mt-3 w-full rounded-lg border border-brand/50 px-3 py-1.5 text-xs font-semibold text-brand-light transition-colors hover:bg-brand/10"
              >
                Buy
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
