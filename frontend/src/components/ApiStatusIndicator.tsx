"use client";

import { useEffect, useState } from "react";
import { ApiClient, type ApiStatus } from "@/lib/api";

export default function ApiStatusIndicator() {
  const [status, setStatus] = useState<ApiStatus>(ApiClient.getLastStatus());
  const [checking, setChecking] = useState(false);

  async function triggerHealthCheck() {
    setChecking(true);
    await ApiClient.checkHealth();
    setStatus(ApiClient.getLastStatus());
    setChecking(false);
  }

  useEffect(() => {
    // Initial check
    triggerHealthCheck();

    // Event listener for real-time status updates from api calls
    const handleStatus = (e: Event) => {
      const customEvent = e as CustomEvent<ApiStatus>;
      if (customEvent.detail) {
        setStatus(customEvent.detail);
      }
    };
    window.addEventListener("api_status_changed", handleStatus);

    // Periodic ping every 20 seconds
    const interval = setInterval(() => {
      ApiClient.checkHealth();
    }, 20000);

    return () => {
      window.removeEventListener("api_status_changed", handleStatus);
      clearInterval(interval);
    };
  }, []);

  return (
    <button
      onClick={triggerHealthCheck}
      disabled={checking}
      title={`Backend: ${status.endpoint} (Checked: ${new Date(
        status.checkedAt
      ).toLocaleTimeString()}). Click to re-check.`}
      className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border transition-colors ${
        status.online
          ? "border-emerald-600/50 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/50"
          : "border-amber-600/50 bg-amber-950/40 text-amber-300 hover:bg-amber-900/50"
      }`}
    >
      <span
        className={`h-2 w-2 rounded-full ${
          status.online
            ? "bg-emerald-400 animate-pulse"
            : "bg-amber-400"
        }`}
      />
      <span>
        {checking
          ? "Checking..."
          : status.online
          ? "API Online"
          : "Mock Mode"}
      </span>
    </button>
  );
}
