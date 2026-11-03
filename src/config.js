// Browser-safe API settings only. MongoDB credentials must never be placed here.
export const DEFAULT_API_URL = "https://finora-backend-lilac.vercel.app/api";

const readSetting = (key, fallback) => {
  try { return localStorage.getItem(key) || fallback; } catch { return fallback; }
};

const savedApiUrl = readSetting("finora_api_url", DEFAULT_API_URL);

export const API_CONFIG = {
  baseUrl: savedApiUrl === "http://localhost:5000/api" ? DEFAULT_API_URL : savedApiUrl,
  mode: readSetting("finora_data_mode", "api")
};

export function setApiConfig({ baseUrl, mode }) {
  try {
    if (baseUrl !== undefined) localStorage.setItem("finora_api_url", baseUrl.trim());
    if (mode !== undefined) localStorage.setItem("finora_data_mode", mode);
  } catch (error) {
    throw new Error(`Could not save settings locally: ${error.message}`);
  }
}

function readSales(key) {
  let saved;
  try {
    saved = localStorage.getItem(key);
  } catch (error) {
    throw new Error(`Local storage is unavailable: ${error.message}`);
  }
  if (saved === null) return null;
  try {
    const records = JSON.parse(saved);
    if (!Array.isArray(records)) throw new Error("Saved sales data is not a list.");
    return records;
  } catch (error) {
    throw new Error(`Could not read saved sales: ${error.message}`);
  }
}

function writeSales(key, records) {
  try {
    localStorage.setItem(key, JSON.stringify(records));
  } catch (error) {
    throw new Error(`Could not save sales on this device: ${error.message}`);
  }
}

export const readOfflineSales = () => readSales("finora_offline_sales");
export const writeOfflineSales = records => writeSales("finora_offline_sales", records);
export const readCachedSales = () => readSales("finora_sales_cache");
export const writeCachedSales = records => writeSales("finora_sales_cache", records);

export async function apiRequest(path, options = {}) {
  const base = readSetting("finora_api_url", API_CONFIG.baseUrl);
  const response = await fetch(`${base.replace(/\/$/, "")}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) }
  });
  const text = await response.text();
  let body = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      if (!response.ok) throw new Error(text);
      throw new Error("The server returned an invalid response.");
    }
  }
  if (!response.ok) throw new Error(body?.message || `API request failed: ${response.status}`);
  return body;
}
