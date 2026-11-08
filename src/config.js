// Browser-safe settings only. MongoDB credentials live on the server and never appear here.
// The app tries the ONLINE backend first and uses the LOCAL server only if the online one is not available.
const env = import.meta.env;
const clean = u => String(u || "").trim().replace(/\/+$/, "");
export const ONLINE_API = clean(env.VITE_API_URL) || "https://finora-backend-lilac.vercel.app/api";
export const LOCAL_API = clean(env.VITE_LOCAL_API_URL) || "http://localhost:5000/api";
const CANDIDATES = [[ONLINE_API, "Online server"], [LOCAL_API, "Local server"]].filter(([u], i, a) => a.findIndex(x => x[0] === u) === i);

let active = null;       // { url, label, dbReady, reason }
let resolving = null;
export const getActiveServer = () => active;

async function probe([url, label]) {
  const ctrl = new AbortController(), timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const r = await fetch(`${url}/health`, { signal: ctrl.signal, cache: "no-store" });
    const j = await r.json();
    return r.ok && j?.ok ? { url, label, dbReady: j.database === "connected", reason: j.reason || "" } : null;
  } catch { return null; }
  finally { clearTimeout(timer); }
}

// Checks both servers at once and picks: online with database > local with database > any that answers.
export function resolveServer(force = false) {
  if (active && !force) return Promise.resolve(active);
  resolving ??= Promise.all(CANDIDATES.map(probe)).then(found => {
    const alive = found.filter(Boolean);
    active = alive.find(s => s.dbReady) || alive[0] || null;
    return active;
  }).finally(() => { resolving = null; });
  return resolving;
}

async function send(base, path, options) {
  const response = await fetch(`${base}${path}`, { ...options, headers: { "Content-Type": "application/json", ...(options.headers || {}) } });
  const text = await response.text();
  let body = null;
  if (text) {
    try { body = JSON.parse(text); }
    catch { throw new Error(response.ok ? "The server returned an invalid response." : `Server error (${response.status}).`); }
  }
  if (!response.ok) throw Object.assign(new Error(body?.message || `Request failed (${response.status}).`), { status: response.status });
  return body;
}

const NO_SERVER = "Cannot reach the online server or a local server. Check your internet, or start the local backend (npm run dev in Finora-backend).";

export async function apiRequest(path, options = {}) {
  let server = await resolveServer();
  if (!server) throw new Error(NO_SERVER);
  try { return await send(server.url, path, options); }
  catch (e) {
    if (e.status) throw e;                      // the server answered with an error: report it as is
    server = await resolveServer(true);         // network failure: look for another server and retry once
    if (!server) throw new Error(NO_SERVER);
    try { return await send(server.url, path, options); }
    catch (e2) { throw e2.status ? e2 : new Error(NO_SERVER); }
  }
}
