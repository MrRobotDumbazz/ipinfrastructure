"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  MockApiClient,
  computeSha256Hex,
  type IpAsset,
  type IpType,
} from "@/lib/mocks";

export default function RegisterPage() {
  const { connected, publicKey } = useWallet();
  const [assets, setAssets] = useState<IpAsset[]>([]);

  // Form fields per contracts/openapi.yaml: RegisterIpRequest
  const [title, setTitle] = useState("");
  const [ipType, setIpType] = useState<IpType>("patent");
  const [contentHash, setContentHash] = useState("");
  const [uri, setUri] = useState("");
  const [rawTextToHash, setRawTextToHash] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    setAssets(MockApiClient.getAssets());
    const handleUpdate = () => setAssets(MockApiClient.getAssets());
    window.addEventListener("ip_store_updated", handleUpdate);
    return () => window.removeEventListener("ip_store_updated", handleUpdate);
  }, []);

  async function handleComputeHash() {
    if (!rawTextToHash.trim()) {
      setStatusMessage({
        type: "error",
        text: "Please enter some text or description to compute SHA-256 hash.",
      });
      return;
    }
    const hash = await computeSha256Hex(rawTextToHash);
    setContentHash(hash);
    setStatusMessage({
      type: "success",
      text: "SHA-256 hash computed successfully!",
    });
  }

  function handleQuickGenerateHash() {
    const randomData = `${title || "asset"}-${Date.now()}-${Math.random()}`;
    computeSha256Hex(randomData).then((h) => {
      setContentHash(h);
      setStatusMessage({
        type: "success",
        text: "Generated sample SHA-256 contentHash.",
      });
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!connected || !publicKey) {
      setStatusMessage({
        type: "error",
        text: "Please connect your Solana wallet first.",
      });
      return;
    }

    if (!title.trim() || title.length > 128) {
      setStatusMessage({
        type: "error",
        text: "Title is required and must not exceed 128 characters.",
      });
      return;
    }

    if (!contentHash.trim()) {
      setStatusMessage({
        type: "error",
        text: "contentHash (SHA-256) is required according to OpenAPI specification.",
      });
      return;
    }

    if (uri && uri.length > 256) {
      setStatusMessage({
        type: "error",
        text: "URI must not exceed 256 characters.",
      });
      return;
    }

    setSubmitting(true);
    setStatusMessage(null);

    try {
      // Simulate on-chain / API latency
      await new Promise((r) => setTimeout(r, 600));

      const created = MockApiClient.registerAsset(
        {
          title: title.trim(),
          type: ipType,
          contentHash: contentHash.trim(),
          uri: uri.trim() || undefined,
        },
        publicKey.toBase58()
      );

      setStatusMessage({
        type: "success",
        text: `[MOCK B2] Successfully registered "${created.title}" (ID: ${created.id}). Tx: ${created.txSignature}`,
      });

      // Reset form
      setTitle("");
      setContentHash("");
      setUri("");
      setRawTextToHash("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to register IP";
      setStatusMessage({ type: "error", text: msg });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex flex-col gap-1">
        <h1 className="text-3xl font-extrabold tracking-tight">Register IP</h1>
        <p className="text-sm text-gray-400">
          Record intellectual property on-chain. Schema conforms strictly to{" "}
          <span className="font-mono text-brand-light">
            contracts/openapi.yaml #/components/schemas/RegisterIpRequest
          </span>
          .
        </p>
      </div>

      {/* Registration Form */}
      <form
        onSubmit={handleSubmit}
        className="mb-10 flex flex-col gap-5 rounded-2xl border border-surface-border bg-surface-card p-6 shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-surface-border pb-3">
          <span className="text-sm font-semibold text-white">
            Asset Information
          </span>
          <span className="rounded bg-brand/10 px-2 py-0.5 text-xs font-mono text-brand-light">
            POST /api/v1/ip/register
          </span>
        </div>

        {/* Title */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Title <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            required
            maxLength={128}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Decentralised Autonomous Patent System"
            className="rounded-lg border border-surface-border bg-surface px-3.5 py-2.5 text-sm text-white placeholder-gray-600 focus:border-brand focus:outline-none transition-colors"
          />
          <span className="text-right text-[11px] text-gray-500">
            {title.length}/128
          </span>
        </div>

        {/* Type & Owner */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              IP Type <span className="text-red-400">*</span>
            </label>
            <select
              value={ipType}
              onChange={(e) => setIpType(e.target.value as IpType)}
              className="rounded-lg border border-surface-border bg-surface px-3.5 py-2.5 text-sm text-white focus:border-brand focus:outline-none transition-colors"
            >
              <option value="patent">Patent</option>
              <option value="copyright">Copyright</option>
              <option value="trademark">Trademark</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Owner Pubkey
            </label>
            <input
              type="text"
              readOnly
              value={
                connected && publicKey
                  ? publicKey.toBase58()
                  : "Wallet not connected"
              }
              className="rounded-lg border border-surface-border bg-surface/50 px-3.5 py-2.5 text-xs font-mono text-gray-400 focus:outline-none"
            />
          </div>
        </div>

        {/* Content Hash (SHA-256) */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Content Hash (SHA-256) <span className="text-red-400">*</span>
            </label>
            <button
              type="button"
              onClick={handleQuickGenerateHash}
              className="text-xs text-brand-light hover:underline"
            >
              Generate sample hash
            </button>
          </div>
          <input
            type="text"
            required
            value={contentHash}
            onChange={(e) => setContentHash(e.target.value)}
            placeholder="64-character hex or base58 SHA-256 digest"
            className="rounded-lg border border-surface-border bg-surface px-3.5 py-2.5 text-xs font-mono text-white placeholder-gray-600 focus:border-brand focus:outline-none transition-colors"
          />

          {/* Quick Hasher helper */}
          <div className="mt-2 rounded-lg border border-surface-border/60 bg-surface/40 p-3">
            <span className="text-xs font-medium text-gray-400">
              Compute hash from document text:
            </span>
            <div className="mt-1.5 flex gap-2">
              <input
                type="text"
                value={rawTextToHash}
                onChange={(e) => setRawTextToHash(e.target.value)}
                placeholder="Paste code snippet, document text, or seed..."
                className="flex-1 rounded-md border border-surface-border bg-surface px-2.5 py-1.5 text-xs text-white placeholder-gray-600 focus:border-brand focus:outline-none"
              />
              <button
                type="button"
                onClick={handleComputeHash}
                className="rounded-md border border-brand/50 bg-brand/20 px-3 py-1.5 text-xs font-medium text-brand-light hover:bg-brand/30 transition-colors"
              >
                Hash (SHA-256)
              </button>
            </div>
          </div>
        </div>

        {/* Metadata URI */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Metadata URI (optional)
          </label>
          <input
            type="url"
            maxLength={256}
            value={uri}
            onChange={(e) => setUri(e.target.value)}
            placeholder="ipfs://... or https://..."
            className="rounded-lg border border-surface-border bg-surface px-3.5 py-2.5 text-sm text-white placeholder-gray-600 focus:border-brand focus:outline-none transition-colors"
          />
        </div>

        {/* Status banner */}
        {statusMessage && (
          <div
            className={`rounded-lg p-3 text-xs ${
              statusMessage.type === "success"
                ? "border border-green-700 bg-green-950/40 text-green-300"
                : "border border-red-700 bg-red-950/40 text-red-300"
            }`}
          >
            {statusMessage.text}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={!connected || submitting}
          className="rounded-lg bg-brand py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Processing on-chain (MOCK)..." : "Register IP Asset"}
        </button>

        {!connected && (
          <p className="text-center text-xs text-yellow-400">
            Connect your wallet at the top right to register assets.
          </p>
        )}
      </form>

      {/* List of Registered Assets */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">Registered IP Assets</h2>
          <span className="rounded bg-surface-card px-2.5 py-1 text-xs text-gray-400 border border-surface-border">
            Total: {assets.length}
          </span>
        </div>

        {assets.length === 0 ? (
          <div className="rounded-xl border border-surface-border bg-surface-card p-8 text-center text-gray-400">
            No registered assets found.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {assets.map((asset) => (
              <div
                key={asset.id}
                className="flex flex-col gap-2 rounded-xl border border-surface-border bg-surface-card p-5 transition-colors hover:border-brand/40"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-white text-base">
                        {asset.title}
                      </h3>
                      <span className="rounded-full bg-brand/20 px-2.5 py-0.5 text-[11px] font-medium uppercase text-brand-light">
                        {asset.type}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-400">
                      ID: <span className="font-mono text-gray-300">{asset.id}</span> ·
                      Owner:{" "}
                      <span className="font-mono text-gray-300">
                        {asset.owner.slice(0, 4)}...{asset.owner.slice(-4)}
                      </span>
                    </p>
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(asset.registeredAt).toLocaleDateString()}
                  </span>
                </div>

                <div className="mt-1 flex flex-col gap-1 border-t border-surface-border/50 pt-2 text-[11px] text-gray-400">
                  <div className="flex items-center gap-1.5 overflow-hidden">
                    <span className="font-semibold text-gray-500">Hash:</span>
                    <span className="truncate font-mono text-gray-300">
                      {asset.contentHash}
                    </span>
                  </div>
                  {asset.uri && (
                    <div className="flex items-center gap-1.5 overflow-hidden">
                      <span className="font-semibold text-gray-500">URI:</span>
                      <a
                        href={asset.uri}
                        target="_blank"
                        rel="noreferrer"
                        className="truncate text-brand-light hover:underline"
                      >
                        {asset.uri}
                      </a>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 overflow-hidden">
                    <span className="font-semibold text-gray-500">Tx:</span>
                    <span className="truncate font-mono text-gray-400">
                      {asset.txSignature}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
