// Browser-safe API settings only. MongoDB credentials must never be placed here.
export const API_CONFIG = {
  baseUrl: localStorage.getItem("finora_api_url") || "http://localhost:5000/api",
  mode: localStorage.getItem("finora_data_mode") || "api"
};

export function setApiConfig({ baseUrl, mode }) {
  if (baseUrl !== undefined) localStorage.setItem("finora_api_url", baseUrl.trim());
  if (mode !== undefined) localStorage.setItem("finora_data_mode", mode);
}

export async function apiRequest(path, options = {}) {
  const base = localStorage.getItem("finora_api_url") || API_CONFIG.baseUrl;
  const response = await fetch(`${base.replace(/\/$/, "")}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) }
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || `API request failed: ${response.status}`);
  return body;
}
