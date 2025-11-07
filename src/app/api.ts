import { environment } from "../environments/environment";

// ===== Cookies helpers =====
function readCookie(name: string): string | null {
  const m = document.cookie.match(
    // ojo con escapes dentro de la clase de caracteres
    new RegExp('(?:^|; )' + name.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&') + '=([^;]*)')
  );
  return m ? decodeURIComponent(m[1]) : null;
}

export function apiBase(): string {
  return String(environment.API_BASE || "").trim().replace(/\/+$/, "");
}

let CSRF: string | null = null;
export function setCsrf(v: string | null | undefined) { CSRF = v || null; }
export function setToken(t: string | null | undefined) { if (t) localStorage.setItem("token", String(t)); }
export function getToken(): string | null {
  let t = localStorage.getItem("token");
  if (!t) {
    const c = readCookie("access");
    if (c) {
      try { localStorage.setItem("token", c); } catch {}
      t = c;
      console.log("[api] token hydrated from cookie");
    }
  }
  return t;
}

type Opts = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  headers?: Record<string, string>;
  body?: any;
  parse?: "json" | "text" | "none";
  signal?: AbortSignal;
};

function buildInit(method: string, headers: Record<string, string>, body: any, signal?: AbortSignal): RequestInit {
  const init: RequestInit = {
    method,
    headers,
    credentials: environment.WITH_CREDENTIALS ? "include" : "same-origin",
    signal,
  };
  if (body !== undefined && method !== "GET") {
    init.body = typeof body === "string" ? body : JSON.stringify(body);
  }
  return init;
}

async function doOnce(url: string, method: string, body: any, extraHeaders?: Record<string, string>) {
  const token = getToken();
  const csrf = CSRF || readCookie("csrf") || null;

  const headers: Record<string, string> = {
    "content-type": "application/json",
    ...(extraHeaders || {}),
  };
  if (token) headers["authorization"] = `Bearer ${token}`;
  if (csrf) headers["x-csrf-token"] = csrf;

  console.log(`[api] ${method} ${url}`, { hasBearer: !!token, hasCsrf: !!csrf });
  const res = await fetch(url, buildInit(method, headers, body));
  return { res, headers };
}

async function _fetch(path: string, opts: Opts = {}) {
  const url = `${apiBase()}${path.startsWith("/") ? "" : "/"}${path}`;
  const method = opts.method || "GET";
  const parse = opts.parse ?? "json";

  let { res, headers } = await doOnce(url, method, opts.body, opts.headers);

  if (res.status === 401 || res.status === 403) {
    // refresco desde cookies y reintento único
    const freshToken = readCookie("access");
    const freshCsrf = readCookie("csrf");
    if (freshToken) {
      headers["authorization"] = `Bearer ${freshToken}`;
      try { localStorage.setItem("token", freshToken); } catch {}
    }
    if (freshCsrf) { headers["x-csrf-token"] = freshCsrf; setCsrf(freshCsrf); }
    console.warn("[api] retrying once after", res.status);
    res = await fetch(url, buildInit(method, headers, opts.body));
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw Object.assign(new Error(`HTTP ${res.status}: ${text}`), { status: res.status, url, ok: false, body: text });
  }
  if (parse === "text") return await res.text();
  if (parse === "none") return undefined;
  return await res.json();
}

export const api = {
  raw: _fetch,

  async login(email: string, password: string) {
    const j = await _fetch("/auth/login", { method: "POST", body: { email, password } });
    setToken(j?.access || readCookie("access"));
    setCsrf(j?.csrf || readCookie("csrf"));
    console.log("[api] login ok", { hasToken: !!getToken(), hasCsrf: !!(CSRF || readCookie("csrf")) });
    return j;
  },

  async signup(email: string, password: string) {
    const j = await _fetch("/auth/signup", { method: "POST", body: { email, password } });
    setToken(j?.access || readCookie("access"));
    setCsrf(j?.csrf || readCookie("csrf"));
    console.log("[api] signup ok", { hasToken: !!getToken(), hasCsrf: !!(CSRF || readCookie("csrf")) });
    return j;
  },
};
