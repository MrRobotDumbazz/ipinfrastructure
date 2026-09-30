/**
 * Реальный API-клиент к REST-сервису backend/api по contracts/openapi.yaml v0.1.0
 * с graceful fallback на локальные моки (B2) при недоступности бэкенда.
 *
 * Источник правды: contracts/openapi.yaml (B1/B2)
 */

import {
  MockApiClient,
  type IpAsset,
  type RegisterIpRequest,
  type License,
  type IssueLicenseRequest,
  type TradeOrder,
  type CreateTradeRequest,
} from "./mocks";

export type DataSource = "backend" | "mock";

export interface ApiResponse<T> {
  data: T;
  source: DataSource;
  error?: string;
}

export interface ApiStatus {
  online: boolean;
  checkedAt: string;
  endpoint: string;
}

const DEFAULT_API_URL = "http://127.0.0.1:3000";

function getApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    return process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_URL;
  }
  return process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_URL;
}

let lastKnownStatus: ApiStatus = {
  online: false,
  checkedAt: new Date().toISOString(),
  endpoint: DEFAULT_API_URL,
};

function notifyStatusChange(online: boolean) {
  lastKnownStatus = {
    online,
    checkedAt: new Date().toISOString(),
    endpoint: getApiBaseUrl(),
  };
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("api_status_changed", { detail: lastKnownStatus })
    );
  }
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 3000
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(options.headers || {}),
      },
    });
    return res;
  } finally {
    clearTimeout(timeoutId);
  }
}

export const ApiClient = {
  getBaseUrl(): string {
    return getApiBaseUrl();
  },

  getLastStatus(): ApiStatus {
    return lastKnownStatus;
  },

  async checkHealth(timeoutMs = 2500): Promise<boolean> {
    const baseUrl = getApiBaseUrl();
    try {
      // Пытаемся опросить /api/v1/ip/assets как легковесный ping
      const res = await fetchWithTimeout(
        `${baseUrl}/api/v1/ip/assets`,
        { method: "GET" },
        timeoutMs
      );
      const isOk = res.ok;
      notifyStatusChange(isOk);
      return isOk;
    } catch {
      notifyStatusChange(false);
      return false;
    }
  },

  // ---------------------------------------------------------------------------
  // /api/v1/ip/assets & /api/v1/ip/register
  // ---------------------------------------------------------------------------

  async listIpAssets(): Promise<ApiResponse<IpAsset[]>> {
    const baseUrl = getApiBaseUrl();
    try {
      const res = await fetchWithTimeout(`${baseUrl}/api/v1/ip/assets`, {
        method: "GET",
      });
      if (res.ok) {
        const data = (await res.json()) as IpAsset[];
        notifyStatusChange(true);
        return { data, source: "backend" };
      }
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    } catch (err: unknown) {
      notifyStatusChange(false);
      const errMsg = err instanceof Error ? err.message : String(err);
      return {
        data: MockApiClient.getAssets(),
        source: "mock",
        error: `Backend unreachable (${errMsg}). Loaded from mock store.`,
      };
    }
  },

  async registerIp(
    req: RegisterIpRequest,
    ownerPubkey: string
  ): Promise<ApiResponse<IpAsset>> {
    const baseUrl = getApiBaseUrl();
    try {
      const res = await fetchWithTimeout(`${baseUrl}/api/v1/ip/register`, {
        method: "POST",
        body: JSON.stringify(req),
      });
      if (res.ok) {
        const data = (await res.json()) as IpAsset;
        notifyStatusChange(true);
        return { data, source: "backend" };
      }
      const errBody = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status}: ${errBody || res.statusText}`);
    } catch (err: unknown) {
      notifyStatusChange(false);
      const errMsg = err instanceof Error ? err.message : String(err);
      // Fallback to local reactive mock store
      const mockCreated = MockApiClient.registerAsset(req, ownerPubkey);
      return {
        data: mockCreated,
        source: "mock",
        error: `Backend API error (${errMsg}). Registered into mock store.`,
      };
    }
  },

  // ---------------------------------------------------------------------------
  // /api/v1/ip/licenses
  // ---------------------------------------------------------------------------

  async listLicenses(): Promise<ApiResponse<License[]>> {
    const baseUrl = getApiBaseUrl();
    try {
      const res = await fetchWithTimeout(`${baseUrl}/api/v1/ip/licenses`, {
        method: "GET",
      });
      if (res.ok) {
        const data = (await res.json()) as License[];
        notifyStatusChange(true);
        return { data, source: "backend" };
      }
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    } catch (err: unknown) {
      notifyStatusChange(false);
      const errMsg = err instanceof Error ? err.message : String(err);
      return {
        data: MockApiClient.getLicenses(),
        source: "mock",
        error: `Backend unreachable (${errMsg}). Loaded from mock store.`,
      };
    }
  },

  async issueLicense(
    req: IssueLicenseRequest,
    licenseePubkey: string
  ): Promise<ApiResponse<License>> {
    const baseUrl = getApiBaseUrl();
    try {
      const res = await fetchWithTimeout(`${baseUrl}/api/v1/ip/licenses`, {
        method: "POST",
        body: JSON.stringify(req),
      });
      if (res.ok) {
        const data = (await res.json()) as License;
        notifyStatusChange(true);
        return { data, source: "backend" };
      }
      const errBody = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status}: ${errBody || res.statusText}`);
    } catch (err: unknown) {
      notifyStatusChange(false);
      const errMsg = err instanceof Error ? err.message : String(err);
      const mockCreated = MockApiClient.issueLicense(req, licenseePubkey);
      return {
        data: mockCreated,
        source: "mock",
        error: `Backend API error (${errMsg}). Issued in mock store.`,
      };
    }
  },

  // ---------------------------------------------------------------------------
  // /api/v1/trade/orders
  // ---------------------------------------------------------------------------

  async listTradeOrders(): Promise<ApiResponse<TradeOrder[]>> {
    const baseUrl = getApiBaseUrl();
    try {
      const res = await fetchWithTimeout(`${baseUrl}/api/v1/trade/orders`, {
        method: "GET",
      });
      if (res.ok) {
        const data = (await res.json()) as TradeOrder[];
        notifyStatusChange(true);
        return { data, source: "backend" };
      }
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    } catch (err: unknown) {
      notifyStatusChange(false);
      const errMsg = err instanceof Error ? err.message : String(err);
      return {
        data: MockApiClient.getTrades(),
        source: "mock",
        error: `Backend unreachable (${errMsg}). Loaded from mock store.`,
      };
    }
  },

  async createTradeOrder(
    req: CreateTradeRequest,
    sellerPubkey: string
  ): Promise<ApiResponse<TradeOrder>> {
    const baseUrl = getApiBaseUrl();
    try {
      const res = await fetchWithTimeout(`${baseUrl}/api/v1/trade/orders`, {
        method: "POST",
        body: JSON.stringify(req),
      });
      if (res.ok) {
        const data = (await res.json()) as TradeOrder;
        notifyStatusChange(true);
        return { data, source: "backend" };
      }
      const errBody = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status}: ${errBody || res.statusText}`);
    } catch (err: unknown) {
      notifyStatusChange(false);
      const errMsg = err instanceof Error ? err.message : String(err);
      const mockCreated = MockApiClient.createTrade(req, sellerPubkey);
      return {
        data: mockCreated,
        source: "mock",
        error: `Backend API error (${errMsg}). Created in mock store.`,
      };
    }
  },

  // ---------------------------------------------------------------------------
  // On-chain Direct Actions (Settlement / Cancel)
  // ---------------------------------------------------------------------------

  async buyTradeOrder(
    orderId: string,
    buyerPubkey: string
  ): Promise<ApiResponse<TradeOrder>> {
    // В текущей фазе покупка и расчет производятся на стороне кошелька/ончейн.
    // Если бэкенд не имеет прямого эндпоинта buy (в openapi v0.1 только POST/GET orders),
    // обновление фиксируется через MockApiClient:
    const updated = MockApiClient.buyTrade(orderId, buyerPubkey);
    return { data: updated, source: "mock" };
  },

  async cancelTradeOrder(
    orderId: string,
    sellerPubkey: string
  ): Promise<ApiResponse<TradeOrder>> {
    const updated = MockApiClient.cancelTrade(orderId, sellerPubkey);
    return { data: updated, source: "mock" };
  },
};
