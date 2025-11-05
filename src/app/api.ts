// src/app/api.ts
type Role = 'user' | 'assistant' | 'tool';
type ChatDelta = (text: string) => void;

export function apiBase(): string {
  const w = (window as any);
  const val = typeof w.__API_BASE__ === 'string' ? w.__API_BASE__ : '';
  return String(val || '').trim().replace(/\/+$/, '');
}

let CSRF: string | null = null;
export function setCsrf(token: string) { CSRF = token || null; }

function readCookie(name: string): string | null {
  const m = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()[\]\\/+^])/g, '\\$1') + '=([^;]*)'));
  return m ? decodeURIComponent(m[1]) : null;
}

function buildInit(init: RequestInit = {}) {
  const headers = new Headers(init.headers || {});
  headers.set('accept', headers.get('accept') || 'application/json');
  if (!headers.has('content-type') && init.body && typeof init.body !== 'string' && !(init.body instanceof FormData)) {
    headers.set('content-type', 'application/json');
  }
  const csrf = CSRF ?? readCookie('csrfToken') ?? readCookie('XSRF-TOKEN');
  if (csrf) headers.set('x-csrf-token', csrf);
  const token = localStorage.getItem('token');
  if (token && !headers.has('authorization')) headers.set('authorization', `Bearer ${token}`);
  return { credentials: 'include' as const, ...init, headers };
}

async function readBody(r: Response) {
  const ct = r.headers.get('content-type') || '';
  try {
    if (ct.includes('application/json')) return await r.json();
    const t = await r.text();
    try { return JSON.parse(t); } catch { return t || null; }
  } catch { return null; }
}

async function tryPaths<T>(paths: string[], init: RequestInit) {
  const base = apiBase();
  if (!base) throw new Error('FALTA_API_BASE');

  let last: { status: number; body?: any } | null = null;

  for (const p of paths) {
    let r: Response;
    try { r = await fetch(`${base}${p}`, buildInit(init)); }
    catch { throw new Error('NETWORK_DOWN'); }

    if (r.status === 401) throw new Error('NO_AUTH');

    if (r.ok) return (await readBody(r)) as T;

    last = { status: r.status, body: await readBody(r) };
    if (r.status === 404) continue;
    const msg = (last.body && (last.body.error || last.body.message)) || `HTTP ${last.status}`;
    throw new Error(msg);
  }

  if (last) {
    const msg = (last.body && (last.body.error || last.body.message)) || `HTTP ${last.status}`;
    throw new Error(msg);
  }
  throw new Error('HTTP 404');
}

/* -------- Auth -------- */
export async function login(email: string, password: string) {
  const attempts: Array<{ path: string; init: RequestInit }> = [
    { path: '/auth/login', init: { method: 'POST', body: JSON.stringify({ email, password }) } },
    { path: '/login',      init: { method: 'POST', body: JSON.stringify({ email, password }) } },
    { path: '/auth/login', init: { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ email, password }).toString() } },
    { path: '/login',      init: { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ email, password }).toString() } },
  ];

  for (const a of attempts) {
    try {
      const data = await tryPaths<{ token?: string }>([a.path], a.init);
      if (data?.token) localStorage.setItem('token', data.token);
      return data;
    } catch (e: any) {
      const msg = (e?.message || '').toUpperCase();
      if (msg.includes('NETWORK_DOWN') || msg.includes('NO_AUTH')) throw e;
      if (msg.includes('400') || msg.includes('404') || msg.includes('415')) continue;
      throw e;
    }
  }
  throw new Error('BAD_INPUT');
}

export async function logout(): Promise<void> {
  const base = apiBase();
  if (!base) { localStorage.removeItem('token'); return; }

  const attempts: Array<{ path: string; init: RequestInit }> = [
    { path: '/auth/logout', init: { method: 'POST' } },
    { path: '/logout',      init: { method: 'POST' } },
  ];

  for (const a of attempts) {
    try {
      await fetch(`${base}${a.path}`, { ...a.init, credentials: 'include', headers: { accept: 'application/json' } });
      break;
    } catch { break; }
  }
  try { localStorage.removeItem('token'); } catch {}
}

/* -------- Mensajes -------- */
export async function listMessages(threadId: string) {
  const qs = threadId ? `?threadId=${encodeURIComponent(threadId)}` : '';
  return tryPaths<{ rows: { role: Role, content: string }[] }>(
    [`/messages${qs}`, `/api/messages${qs}`],
    { method: 'GET' }
  );
}

export async function postMessage(threadId: string, role: Role, content: string, toolMeta?: any) {
  const body = JSON.stringify({ threadId, role, content, toolMeta });
  return tryPaths(['/messages', '/api/messages'], { method: 'POST', body });
}

/* -------- Streaming -------- */
export async function chatStream(args: {
  threadId: string; message: string; onDelta: ChatDelta; signal?: AbortSignal;
}) {
  const base = apiBase();
  if (!base) throw new Error('FALTA_API_BASE');

  const headers = new Headers();
  headers.set('accept', 'text/event-stream');
  headers.set('content-type', 'application/json');

  const csrf = CSRF ?? readCookie('csrfToken') ?? readCookie('XSRF-TOKEN');
  if (csrf) headers.set('x-csrf-token', csrf);
  const token = localStorage.getItem('token');
  if (token) headers.set('authorization', `Bearer ${token}`);

  const payload = JSON.stringify({ threadId: args.threadId, content: args.message });
  const candidates = ['/chat', '/api/chat'];
  let lastErr: any = null;

  for (const path of candidates) {
    try {
      const r = await fetch(`${base}${path}`, {
        method: 'POST',
        body: payload,
        signal: args.signal,
        headers,
        credentials: 'include'
      });
      if (r.status === 401) throw new Error('NO_AUTH');
      if (!r.ok || !r.body) {
        const body = await readBody(r).catch(() => null);
        const msg = (body && (body.error || body.message)) || `HTTP ${r.status}`;
        if (r.status === 404) { lastErr = new Error(msg); continue; }
        throw new Error(`SSE ${path}: ${msg}`);
      }

      const reader = r.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let idx: number;
        while ((idx = buffer.indexOf('\n\n')) >= 0) {
          const raw = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);
          for (const line of raw.split('\n')) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data:')) continue;
            const json = trimmed.slice(5).trim();
            if (!json) continue;
            try {
              const evt = JSON.parse(json);
              if (evt?.type === 'chunk' && typeof evt.value === 'string') args.onDelta(evt.value);
              else if (evt?.type === 'done') return;
              else if (evt?.type === 'error') throw new Error(evt.message || 'Error de streaming');
            } catch {
              if (json && typeof json === 'string') args.onDelta(json);
            }
          }
        }
      }
      return;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error('HTTP 404');
}
