"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  MockApiClient,
  type IpAsset,
  type License,
  type LicenseType,
} from "@/lib/mocks";

export default function LicensePage() {
  const { connected, publicKey } = useWallet();
  const [assets, setAssets] = useState<IpAsset[]>([]);
  const [licenses, setLicenses] = useState<License[]>([]);

  // Form fields per contracts/openapi.yaml: IssueLicenseRequest
  const [selectedIpId, setSelectedIpId] = useState("");
  const [licenseType, setLicenseType] = useState<LicenseType>("non-exclusive");
  const [royaltyBps, setRoyaltyBps] = useState(500); // 5%
  const [customLicensee, setCustomLicensee] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    const refreshData = () => {
      const loadedAssets = MockApiClient.getAssets();
      setAssets(loadedAssets);
      if (loadedAssets.length > 0 && !selectedIpId) {
        setSelectedIpId(loadedAssets[0].id);
      }
      setLicenses(MockApiClient.getLicenses());
    };

    refreshData();
    window.addEventListener("ip_store_updated", refreshData);
    return () => window.removeEventListener("ip_store_updated", refreshData);
  }, [selectedIpId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!connected || !publicKey) {
      setStatusMessage({
        type: "error",
        text: "Please connect your wallet first.",
      });
      return;
    }

    if (!selectedIpId) {
      setStatusMessage({
        type: "error",
        text: "Please select an IP asset.",
      });
      return;
    }

    if (royaltyBps < 0 || royaltyBps > 10000) {
      setStatusMessage({
        type: "error",
        text: "Royalty BPS must be between 0 and 10000 (0% - 100%).",
      });
      return;
    }

    const licensee = customLicensee.trim() || publicKey.toBase58();

    setSubmitting(true);
    setStatusMessage(null);

    try {
      await new Promise((r) => setTimeout(r, 600));

      const newLicense = MockApiClient.issueLicense(
        {
          ipAssetId: selectedIpId,
          licenseType,
          royaltyBps,
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
        },
        licensee
      );

      setStatusMessage({
        type: "success",
        text: `[MOCK B2] Successfully issued ${licenseType} licence for asset ${selectedIpId}. Tx: ${newLicense.txSignature}`,
      });

      setCustomLicensee("");
      setExpiresAt("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to issue license";
      setStatusMessage({ type: "error", text: msg });
    } finally {
      setSubmitting(false);
    }
  }

  const selectedAsset = assets.find((a) => a.id === selectedIpId);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex flex-col gap-1">
        <h1 className="text-3xl font-extrabold tracking-tight">License IP</h1>
        <p className="text-sm text-gray-400">
          Issue programmatic licences for registered IP assets. Schema conforms to{" "}
          <span className="font-mono text-brand-light">
            contracts/openapi.yaml #/components/schemas/IssueLicenseRequest
          </span>
          .
        </p>
      </div>

      {/* License Issuance Form */}
      <form
        onSubmit={handleSubmit}
        className="mb-10 flex flex-col gap-5 rounded-2xl border border-surface-border bg-surface-card p-6 shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-surface-border pb-3">
          <span className="text-sm font-semibold text-white">
            Licence Terms
          </span>
          <span className="rounded bg-brand/10 px-2 py-0.5 text-xs font-mono text-brand-light">
            POST /api/v1/ip/licenses
          </span>
        </div>

        {/* IP Asset Selection */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Select IP Asset <span className="text-red-400">*</span>
          </label>
          {assets.length === 0 ? (
            <p className="rounded-lg border border-yellow-700/50 bg-yellow-950/20 p-3 text-xs text-yellow-300">
              No registered assets found. Please register an IP asset first in the &quot;Register IP&quot; screen.
            </p>
          ) : (
            <select
              value={selectedIpId}
              onChange={(e) => setSelectedIpId(e.target.value)}
              className="rounded-lg border border-surface-border bg-surface px-3.5 py-2.5 text-sm text-white focus:border-brand focus:outline-none transition-colors"
            >
              {assets.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.title} ({asset.type.toUpperCase()}) — ID: {asset.id}
                </option>
              ))}
            </select>
          )}
          {selectedAsset && (
            <p className="text-xs text-gray-500">
              Owner:{" "}
              <span className="font-mono text-gray-400">
                {selectedAsset.owner}
              </span>
            </p>
          )}
        </div>

        {/* License Type */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Licence Type <span className="text-red-400">*</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            {(["non-exclusive", "exclusive"] as const).map((type) => (
              <label
                key={type}
                className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 transition-colors ${
                  licenseType === type
                    ? "border-brand bg-brand/15 text-white"
                    : "border-surface-border bg-surface text-gray-400 hover:border-gray-600"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <input
                    type="radio"
                    name="licenseType"
                    value={type}
                    checked={licenseType === type}
                    onChange={() => setLicenseType(type)}
                    className="accent-brand"
                  />
                  <span className="text-sm font-medium capitalize">{type}</span>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Royalty (BPS) */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Royalty Rate <span className="text-red-400">*</span>
            </label>
            <span className="rounded bg-brand/20 px-2 py-0.5 text-xs font-semibold text-brand-light">
              {(royaltyBps / 100).toFixed(2)}% ({royaltyBps} BPS)
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={10000}
            step={25}
            value={royaltyBps}
            onChange={(e) => setRoyaltyBps(Number(e.target.value))}
            className="h-2 w-full cursor-pointer accent-brand"
          />
          <div className="flex justify-between text-[11px] text-gray-500">
            <span>0% (0 BPS)</span>
            <span>25% (2500 BPS)</span>
            <span>50% (5000 BPS)</span>
            <span>100% (10000 BPS)</span>
          </div>
        </div>

        {/* Custom Licensee & Expiration */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Licensee Pubkey (optional)
            </label>
            <input
              type="text"
              value={customLicensee}
              onChange={(e) => setCustomLicensee(e.target.value)}
              placeholder={
                connected && publicKey
                  ? `Default: ${publicKey.toBase58().slice(0, 8)}...`
                  : "Solana address..."
              }
              className="rounded-lg border border-surface-border bg-surface px-3.5 py-2 text-xs font-mono text-white placeholder-gray-600 focus:border-brand focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Expiration Date (optional)
            </label>
            <input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="rounded-lg border border-surface-border bg-surface px-3.5 py-2 text-xs text-white focus:border-brand focus:outline-none"
            />
          </div>
        </div>

        {/* Status Message */}
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
          disabled={!connected || submitting || assets.length === 0}
          className="rounded-lg bg-brand py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Issuing on-chain (MOCK)..." : "Issue Licence"}
        </button>

        {!connected && (
          <p className="text-center text-xs text-yellow-400">
            Connect your wallet to issue licences.
          </p>
        )}
      </form>

      {/* Active Licenses List */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">Active Licences</h2>
          <span className="rounded bg-surface-card px-2.5 py-1 text-xs text-gray-400 border border-surface-border">
            Total: {licenses.length}
          </span>
        </div>

        {licenses.length === 0 ? (
          <div className="rounded-xl border border-surface-border bg-surface-card p-8 text-center text-gray-400">
            No active licences found.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {licenses.map((lic) => {
              const matchedAsset = assets.find((a) => a.id === lic.ipAssetId);
              return (
                <div
                  key={lic.id}
                  className="flex flex-col gap-2 rounded-xl border border-surface-border bg-surface-card p-5 transition-colors hover:border-brand/40"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-white text-base">
                          {matchedAsset?.title ?? lic.ipAssetId}
                        </h3>
                        <span className="rounded-full bg-brand/20 px-2.5 py-0.5 text-[11px] font-medium uppercase text-brand-light">
                          {lic.licenseType}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-gray-400">
                        Licensee:{" "}
                        <span className="font-mono text-gray-300">
                          {lic.licensee.slice(0, 4)}...{lic.licensee.slice(-4)}
                        </span>{" "}
                        · Royalty:{" "}
                        <span className="font-semibold text-brand-light">
                          {(lic.royaltyBps / 100).toFixed(2)}%
                        </span>
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-xs text-gray-400">
                        {lic.expiresAt
                          ? `Expires: ${new Date(lic.expiresAt).toLocaleDateString()}`
                          : "Perpetual"}
                      </span>
                    </div>
                  </div>

                  <div className="mt-1 flex flex-col gap-1 border-t border-surface-border/50 pt-2 text-[11px] text-gray-400">
                    <div className="flex items-center gap-1.5 overflow-hidden">
                      <span className="font-semibold text-gray-500">Asset ID:</span>
                      <span className="font-mono text-gray-300">{lic.ipAssetId}</span>
                    </div>
                    <div className="flex items-center gap-1.5 overflow-hidden">
                      <span className="font-semibold text-gray-500">Tx:</span>
                      <span className="truncate font-mono text-gray-400">
                        {lic.txSignature}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
