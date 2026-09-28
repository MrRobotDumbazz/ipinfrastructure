/**
 * Моки данных и Mock API клиент для экранов dApp.
 *
 * MOCK (B2) — реализует схемы и методы из contracts/openapi.yaml v0.1.0:
 * - /api/v1/ip/register (POST) -> RegisterIpRequest -> IpAsset
 * - /api/v1/ip/assets (GET) -> IpAsset[]
 * - /api/v1/ip/licenses (POST) -> IssueLicenseRequest -> License
 * - /api/v1/ip/licenses (GET) -> License[]
 * - /api/v1/trade/orders (POST) -> CreateTradeRequest -> TradeOrder
 * - /api/v1/trade/orders (GET) -> TradeOrder[]
 *
 * Источник правды: contracts/openapi.yaml (B1/B2)
 */

// ---------------------------------------------------------------------------
// Типы строго по contracts/openapi.yaml (v0.1.0)
// ---------------------------------------------------------------------------

export type IpType = "patent" | "copyright" | "trademark";
export type LicenseType = "exclusive" | "non-exclusive";
export type TradeStatus = "open" | "completed" | "cancelled";

export interface RegisterIpRequest {
  title: string;
  type: IpType;
  contentHash: string; // SHA-256 хэш содержимого (hex или base58)
  uri?: string;
}

export interface IpAsset {
  id: string;
  title: string;
  type: IpType;
  owner: string;
  contentHash: string;
  uri?: string;
  registeredAt: string; // date-time
  txSignature: string;
}

export interface IssueLicenseRequest {
  ipAssetId: string;
  licenseType: LicenseType;
  royaltyBps: number; // 0..10000
  expiresAt?: string | null; // date-time
}

export interface License {
  id: string;
  ipAssetId: string;
  licenseType: LicenseType;
  licensee: string;
  royaltyBps: number;
  expiresAt: string | null;
  txSignature: string;
}

export interface CreateTradeRequest {
  ipAssetId: string;
  priceInSol: number; // >= 0.000000001
}

export interface TradeOrder {
  id: string;
  ipAssetId: string;
  seller: string;
  buyer: string | null;
  priceInSol: number;
  status: TradeStatus;
  txSignature: string | null;
}

// ---------------------------------------------------------------------------
// Базовые начальные данные (B2)
// ---------------------------------------------------------------------------

export const INITIAL_IP_ASSETS: IpAsset[] = [
  {
    id: "ip-001",
    title: "Decentralised IP Registry Protocol",
    type: "patent",
    owner: "7GkMCm7bXvSre8tK9p29L3f4dMkWG8K4Q",
    contentHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    uri: "https://ipfs.io/ipfs/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
    registeredAt: "2026-09-01T10:00:00Z",
    txSignature: "5abc111111111111111111111111111111111111111111111111111111110001",
  },
  {
    id: "ip-002",
    title: "Zero-Trust Agent Constitution v1",
    type: "copyright",
    owner: "7GkMCm7bXvSre8tK9p29L3f4dMkWG8K4Q",
    contentHash: "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    uri: "https://github.com/MrRobotDumbazz/ipinfrastructure/blob/main/AGENTS.md",
    registeredAt: "2026-09-15T14:30:00Z",
    txSignature: "5abc222222222222222222222222222222222222222222222222222222220002",
  },
];

export const INITIAL_LICENSES: License[] = [
  {
    id: "lic-001",
    ipAssetId: "ip-001",
    licenseType: "non-exclusive",
    licensee: "9RtZ8WvL2MqpF3z4K91A7bScDeFgHiJkLm",
    royaltyBps: 500, // 5%
    expiresAt: "2027-09-01T00:00:00Z",
    txSignature: "5abc333333333333333333333333333333333333333333333333333333330010",
  },
];

export const INITIAL_TRADES: TradeOrder[] = [
  {
    id: "trade-001",
    ipAssetId: "ip-002",
    seller: "7GkMCm7bXvSre8tK9p29L3f4dMkWG8K4Q",
    buyer: null,
    priceInSol: 10,
    status: "open",
    txSignature: null,
  },
];

// Для обратной совместимости импортов
export const MOCK_IP_ASSETS = INITIAL_IP_ASSETS;
export const MOCK_LICENSES = INITIAL_LICENSES;
export const MOCK_TRADES = INITIAL_TRADES;

// ---------------------------------------------------------------------------
// Mock Store & Client (B2)
// ---------------------------------------------------------------------------

const STORAGE_KEYS = {
  ASSETS: "ip_mock_assets_v1",
  LICENSES: "ip_mock_licenses_v1",
  TRADES: "ip_mock_trades_v1",
};

function generateFakeTx(): string {
  const chars = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let out = "5";
  for (let i = 0; i < 63; i++) {
    out += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return out;
}

export async function computeSha256Hex(text: string): Promise<string> {
  if (typeof window === "undefined" || !window.crypto?.subtle) {
    return "0".repeat(64);
  }
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await window.crypto.subtle.digest(
    "SHA-256",
    data as unknown as BufferSource
  );
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const MockApiClient = {
  getAssets(): IpAsset[] {
    if (typeof window === "undefined") return INITIAL_IP_ASSETS;
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ASSETS);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return INITIAL_IP_ASSETS;
  },

  registerAsset(req: RegisterIpRequest, ownerPubkey: string): IpAsset {
    const assets = this.getAssets();
    const newAsset: IpAsset = {
      id: `ip-${Date.now().toString(36)}`,
      title: req.title.trim(),
      type: req.type,
      owner: ownerPubkey,
      contentHash: req.contentHash.trim(),
      uri: req.uri?.trim() || undefined,
      registeredAt: new Date().toISOString(),
      txSignature: generateFakeTx(),
    };

    const updated = [newAsset, ...assets];
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEYS.ASSETS, JSON.stringify(updated));
        window.dispatchEvent(new Event("ip_store_updated"));
      } catch (err) {
        console.error("Storage error:", err);
      }
    }
    return newAsset;
  },

  getLicenses(): License[] {
    if (typeof window === "undefined") return INITIAL_LICENSES;
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.LICENSES);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return INITIAL_LICENSES;
  },

  issueLicense(req: IssueLicenseRequest, licenseePubkey: string): License {
    const licenses = this.getLicenses();
    const newLicense: License = {
      id: `lic-${Date.now().toString(36)}`,
      ipAssetId: req.ipAssetId,
      licenseType: req.licenseType,
      licensee: licenseePubkey,
      royaltyBps: req.royaltyBps,
      expiresAt: req.expiresAt || null,
      txSignature: generateFakeTx(),
    };

    const updated = [newLicense, ...licenses];
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEYS.LICENSES, JSON.stringify(updated));
        window.dispatchEvent(new Event("ip_store_updated"));
      } catch (err) {
        console.error("Storage error:", err);
      }
    }
    return newLicense;
  },

  getTrades(): TradeOrder[] {
    if (typeof window === "undefined") return INITIAL_TRADES;
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.TRADES);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return INITIAL_TRADES;
  },

  createTrade(req: CreateTradeRequest, sellerPubkey: string): TradeOrder {
    const trades = this.getTrades();
    const newTrade: TradeOrder = {
      id: `trade-${Date.now().toString(36)}`,
      ipAssetId: req.ipAssetId,
      seller: sellerPubkey,
      buyer: null,
      priceInSol: req.priceInSol,
      status: "open",
      txSignature: null,
    };

    const updated = [newTrade, ...trades];
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEYS.TRADES, JSON.stringify(updated));
        window.dispatchEvent(new Event("ip_store_updated"));
      } catch (err) {
        console.error("Storage error:", err);
      }
    }
    return newTrade;
  },

  buyTrade(tradeId: string, buyerPubkey: string): TradeOrder {
    const trades = this.getTrades();
    let updatedOrder: TradeOrder | null = null;

    const updated = trades.map((t) => {
      if (t.id === tradeId && t.status === "open") {
        updatedOrder = {
          ...t,
          buyer: buyerPubkey,
          status: "completed" as const,
          txSignature: generateFakeTx(),
        };
        return updatedOrder;
      }
      return t;
    });

    if (!updatedOrder) {
      throw new Error(`Order ${tradeId} is not available for purchase`);
    }

    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEYS.TRADES, JSON.stringify(updated));
        window.dispatchEvent(new Event("ip_store_updated"));
      } catch (err) {
        console.error("Storage error:", err);
      }
    }
    return updatedOrder;
  },

  cancelTrade(tradeId: string, callerPubkey: string): TradeOrder {
    const trades = this.getTrades();
    let updatedOrder: TradeOrder | null = null;

    const updated = trades.map((t) => {
      if (t.id === tradeId && t.status === "open") {
        if (t.seller !== callerPubkey) {
          throw new Error("Only the seller can cancel this listing");
        }
        updatedOrder = {
          ...t,
          status: "cancelled" as const,
        };
        return updatedOrder;
      }
      return t;
    });

    if (!updatedOrder) {
      throw new Error(`Order ${tradeId} cannot be cancelled`);
    }

    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEYS.TRADES, JSON.stringify(updated));
        window.dispatchEvent(new Event("ip_store_updated"));
      } catch (err) {
        console.error("Storage error:", err);
      }
    }
    return updatedOrder;
  },
};
