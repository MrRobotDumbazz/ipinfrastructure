"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { ApiClient, type DataSource } from "@/lib/api";
import {
  type IpAsset,
  type TradeOrder,
  type TradeStatus,
} from "@/lib/mocks";

const STATUS_BADGE_STYLE: Record<TradeStatus, string> = {
  open: "text-amber-400 bg-amber-950/40 border-amber-600/40",
  completed: "text-emerald-400 bg-emerald-950/40 border-emerald-600/40",
  cancelled: "text-rose-400 bg-rose-950/40 border-rose-600/40",
};

export default function TradePage() {
  const { connected, publicKey } = useWallet();
  const [assets, setAssets] = useState<IpAsset[]>([]);
  const [trades, setTrades] = useState<TradeOrder[]>([]);
  const [dataSource, setDataSource] = useState<DataSource>("mock");
  const [loading, setLoading] = useState(true);

  // Form fields per contracts/openapi.yaml: CreateTradeRequest
  const [selectedIpId, setSelectedIpId] = useState("");
  const [priceSol, setPriceSol] = useState("1.5");
  const [submitting, setSubmitting] = useState(false);
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
    source?: DataSource;
  } | null>(null);

  // Filter tabs
  const [filterTab, setFilterTab] = useState<"all" | "open" | "my">("all");

  async function refreshData() {
    setLoading(true);
    const [assetsResp, tradesResp] = await Promise.all([
      ApiClient.listIpAssets(),
      ApiClient.listTradeOrders(),
    ]);

    setAssets(assetsResp.data);
    setTrades(tradesResp.data);
    setDataSource(tradesResp.source === "backend" || assetsResp.source === "backend" ? "backend" : "mock");

    if (assetsResp.data.length > 0 && !selectedIpId) {
      setSelectedIpId(assetsResp.data[0].id);
    }
    setLoading(false);
  }

  useEffect(() => {
    refreshData();
    window.addEventListener("ip_store_updated", refreshData);
    return () => window.removeEventListener("ip_store_updated", refreshData);
  }, [selectedIpId]);

  async function handleCreateTrade(e: React.FormEvent) {
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
        text: "Please select an IP asset to list for sale.",
      });
      return;
    }

    const price = parseFloat(priceSol);
    if (isNaN(price) || price < 0.000000001) {
      setStatusMessage({
        type: "error",
        text: "Price must be at least 0.000000001 SOL per OpenAPI schema.",
      });
      return;
    }

    setSubmitting(true);
    setStatusMessage(null);

    try {
      const resp = await ApiClient.createTradeOrder(
        {
          ipAssetId: selectedIpId,
          priceInSol: price,
        },
        publicKey.toBase58()
      );

      const newOrder = resp.data;
      setStatusMessage({
        type: "success",
        text: `[${resp.source.toUpperCase()}] Listed asset ${newOrder.ipAssetId} for ${newOrder.priceInSol} SOL (Order: ${newOrder.id}).`,
        source: resp.source,
      });

      await refreshData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create trade order";
      setStatusMessage({ type: "error", text: msg });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleBuy(orderId: string) {
    if (!connected || !publicKey) {
      setStatusMessage({
        type: "error",
        text: "Please connect your wallet to purchase this asset.",
      });
      return;
    }

    setActionInProgressId(orderId);
    setStatusMessage(null);

    try {
      const resp = await ApiClient.buyTradeOrder(orderId, publicKey.toBase58());
      const completed = resp.data;
      setStatusMessage({
        type: "success",
        text: `Successfully purchased ${completed.ipAssetId} for ${completed.priceInSol} SOL! Tx: ${completed.txSignature || "confirmed"}`,
        source: resp.source,
      });
      await refreshData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Purchase failed";
      setStatusMessage({ type: "error", text: msg });
    } finally {
      setActionInProgressId(null);
    }
  }

  async function handleCancel(orderId: string) {
    if (!connected || !publicKey) return;

    setActionInProgressId(orderId);
    setStatusMessage(null);

    try {
      const resp = await ApiClient.cancelTradeOrder(orderId, publicKey.toBase58());
      setStatusMessage({
        type: "success",
        text: `Trade order ${orderId} cancelled.`,
        source: resp.source,
      });
      await refreshData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Cancel failed";
      setStatusMessage({ type: "error", text: msg });
    } finally {
      setActionInProgressId(null);
    }
  }

  const myPubkey = publicKey?.toBase58();

  const filteredTrades = trades.filter((t) => {
    if (filterTab === "open") return t.status === "open";
    if (filterTab === "my") return myPubkey && (t.seller === myPubkey || t.buyer === myPubkey);
    return true;
  });

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex flex-col gap-1">
        <h1 className="text-3xl font-extrabold tracking-tight">Trade IP</h1>
        <p className="text-sm text-gray-400">
          Peer-to-peer marketplace for intellectual property assets. Schema conforms to{" "}
          <span className="font-mono text-brand-light">
            contracts/openapi.yaml #/components/schemas/TradeOrder
          </span>
          .
        </p>
      </div>

      {/* List For Sale Form */}
      <form
        onSubmit={handleCreateTrade}
        className="mb-10 flex flex-col gap-5 rounded-2xl border border-surface-border bg-surface-card p-6 shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-surface-border pb-3">
          <span className="text-sm font-semibold text-white">
            List IP for Sale
          </span>
          <div className="flex items-center gap-2">
            <span
              className={`rounded px-2 py-0.5 text-xs font-mono border ${
                dataSource === "backend"
                  ? "bg-emerald-950/40 border-emerald-600/50 text-emerald-300"
                  : "bg-amber-950/40 border-amber-600/50 text-amber-300"
              }`}
            >
              Mode: {dataSource === "backend" ? "Live API" : "Mock Fallback"}
            </span>
            <span className="rounded bg-brand/10 px-2 py-0.5 text-xs font-mono text-brand-light">
              POST /api/v1/trade/orders
            </span>
          </div>
        </div>

        {/* IP Asset Selection */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Select IP Asset <span className="text-red-400">*</span>
          </label>
          {assets.length === 0 ? (
            <p className="rounded-lg border border-yellow-700/50 bg-yellow-950/20 p-3 text-xs text-yellow-300">
              No registered assets available.
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
        </div>

        {/* Price in SOL */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Price in SOL <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <input
              type="number"
              min="0.000000001"
              step="any"
              required
              value={priceSol}
              onChange={(e) => setPriceSol(e.target.value)}
              className="w-full rounded-lg border border-surface-border bg-surface px-3.5 py-2.5 text-sm text-white focus:border-brand focus:outline-none transition-colors"
            />
            <span className="absolute right-3.5 top-2.5 text-xs font-semibold text-gray-400">
              SOL
            </span>
          </div>
          <span className="text-[11px] text-gray-500">
            Minimum: 0.000000001 SOL (1 lamport)
          </span>
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
          {submitting ? "Creating listing..." : "Create Trade Listing"}
        </button>

        {!connected && (
          <p className="text-center text-xs text-yellow-400">
            Connect your wallet to list assets for sale.
          </p>
        )}
      </form>

      {/* Marketplace Listings */}
      <div>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold">Marketplace Orders</h2>
            <span
              className={`rounded px-2 py-0.5 text-[11px] font-medium border ${
                dataSource === "backend"
                  ? "border-emerald-600/50 bg-emerald-950/40 text-emerald-300"
                  : "border-amber-600/50 bg-amber-950/40 text-amber-300"
              }`}
            >
              Source: {dataSource}
            </span>
          </div>

          {/* Filter Tabs */}
          <div className="flex rounded-lg border border-surface-border bg-surface p-1">
            {(["all", "open", "my"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilterTab(tab)}
                className={`rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors ${
                  filterTab === tab
                    ? "bg-brand text-white"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {tab === "my" ? "My Orders" : tab}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="rounded-xl border border-surface-border bg-surface-card p-8 text-center text-gray-400">
            Loading orders...
          </div>
        ) : filteredTrades.length === 0 ? (
          <div className="rounded-xl border border-surface-border bg-surface-card p-8 text-center text-gray-400">
            No orders match the selected filter.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filteredTrades.map((trade) => {
              const matchedAsset = assets.find((a) => a.id === trade.ipAssetId);
              const isSeller = myPubkey && trade.seller === myPubkey;
              const isBusy = actionInProgressId === trade.id;

              return (
                <div
                  key={trade.id}
                  className="flex flex-col gap-3 rounded-xl border border-surface-border bg-surface-card p-5 transition-colors hover:border-brand/40"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-white text-base">
                          {matchedAsset?.title ?? trade.ipAssetId}
                        </h3>
                        <span
                          className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase ${STATUS_BADGE_STYLE[trade.status]}`}
                        >
                          {trade.status}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-gray-400">
                        Seller:{" "}
                        <span className="font-mono text-gray-300">
                          {trade.seller.slice(0, 4)}...{trade.seller.slice(-4)}
                        </span>
                        {isSeller && (
                          <span className="ml-1.5 text-[11px] text-brand-light">
                            (You)
                          </span>
                        )}
                        {trade.buyer && (
                          <>
                            {" "}
                            · Buyer:{" "}
                            <span className="font-mono text-gray-300">
                              {trade.buyer.slice(0, 4)}...{trade.buyer.slice(-4)}
                            </span>
                          </>
                        )}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-lg font-bold text-white">
                        {trade.priceInSol} SOL
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 border-t border-surface-border/50 pt-2 text-[11px] text-gray-400">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-gray-500">
                        Order ID: {trade.id}
                      </span>
                      {trade.txSignature && (
                        <span className="truncate font-mono text-gray-400">
                          Tx: {trade.txSignature.slice(0, 8)}...
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  {trade.status === "open" && connected && (
                    <div className="flex items-center gap-2 pt-1">
                      {!isSeller ? (
                        <button
                          onClick={() => handleBuy(trade.id)}
                          disabled={isBusy}
                          className="w-full rounded-lg bg-emerald-600/90 py-2 text-xs font-semibold text-white shadow transition-all hover:bg-emerald-500 disabled:opacity-50"
                        >
                          {isBusy ? "Processing Buy..." : `Buy for ${trade.priceInSol} SOL`}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleCancel(trade.id)}
                          disabled={isBusy}
                          className="w-full rounded-lg border border-rose-700/60 bg-rose-950/20 py-1.5 text-xs font-semibold text-rose-300 transition-all hover:bg-rose-900/40 disabled:opacity-50"
                        >
                          {isBusy ? "Cancelling..." : "Cancel Listing"}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
