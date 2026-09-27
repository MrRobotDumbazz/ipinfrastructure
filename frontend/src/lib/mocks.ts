/**
 * Моки данных для экранов dApp.
 *
 * MOCK (B2) — контракт contracts/openapi.yaml v0.0.0-placeholder содержит paths: {}.
 * Все данные здесь фиктивны и должны быть заменены на реальные API-вызовы
 * по contracts/openapi.yaml после его наполнения координатором.
 *
 * Ссылка: contracts/openapi.yaml (B1/B2)
 */

// ---------------------------------------------------------------------------
// Типы (будут выведены из openapi.yaml после наполнения контракта)
// ---------------------------------------------------------------------------

export interface IpAsset {
  id: string;
  title: string;
  type: "patent" | "copyright" | "trademark";
  owner: string;
  registeredAt: string;
  txSignature: string;
}

export interface License {
  id: string;
  ipAssetId: string;
  licenseType: "exclusive" | "non-exclusive";
  licensee: string;
  royaltyBps: number; // basis points (100 = 1%)
  expiresAt: string | null;
  txSignature: string;
}

export interface Trade {
  id: string;
  ipAssetId: string;
  seller: string;
  buyer: string | null;
  priceInSol: number;
  status: "open" | "completed" | "cancelled";
  txSignature: string | null;
}

// ---------------------------------------------------------------------------
// MOCK (B2) — данные
// ---------------------------------------------------------------------------

export const MOCK_IP_ASSETS: IpAsset[] = [
  {
    id: "ip-001",
    title: "Decentralised IP Registry Protocol",
    type: "patent",
    owner: "7GkM...4XpQ",
    registeredAt: "2026-09-01T10:00:00Z",
    txSignature: "5abc...0001",
  },
  {
    id: "ip-002",
    title: "Zero-Trust Agent Constitution v1",
    type: "copyright",
    owner: "7GkM...4XpQ",
    registeredAt: "2026-09-15T14:30:00Z",
    txSignature: "5abc...0002",
  },
];

export const MOCK_LICENSES: License[] = [
  {
    id: "lic-001",
    ipAssetId: "ip-001",
    licenseType: "non-exclusive",
    licensee: "9RtZ...8WvL",
    royaltyBps: 500,
    expiresAt: "2027-09-01T00:00:00Z",
    txSignature: "5abc...0010",
  },
];

export const MOCK_TRADES: Trade[] = [
  {
    id: "trade-001",
    ipAssetId: "ip-002",
    seller: "7GkM...4XpQ",
    buyer: null,
    priceInSol: 10,
    status: "open",
    txSignature: null,
  },
];
