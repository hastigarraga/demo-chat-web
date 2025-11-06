// src/app/api.ts
type Role = 'user' | 'assistant' | 'tool';
export type Thread = { _id: string; title: string };

export function apiBase(): string {
  const w = (window as any);
  const val = typeof w.__API_BASE__ === 'string' ? w.__API_BASE__ : '';
  return String(val || '').trim().replace(/\/+$/, '');
}

let CSRF: string | null = null;
export function setCsrf(token: string | null | undefined) { CSRF = token || null; }

function readCookie(name: string): string | null {
  // Escapa el nombre para uso seguro en RegExp
  const safe = name.replace(/([.$?*|{}()[\]\\/+^])/g, '\\$1');
  const pattern = new RegExp('(?:^|; )' + safe + '=([^;]*)');
  const m = document.cookie.match(pattern);
  return m ? decodeURIComponent(m[1]) : null;
}

function baseInit(init: RequestInit): RequestInit {
  const headers = new Headers(init.headers || {});
  headers.set('accept', 'application/json, text/plain, */*');

  const csrf = CSRF ?? readCookie('csrf') ?? readCookie('csrfToken') ?? readCookie('XSRF-TOKEN');
  if (csrf) headers.set('x-csrf-token', csrf);

  const token = localStorage.getItem('token');
  if (token) headers.set('authorization', `Bearer ${token}`);

  const final: RequestInit = { ...init, headers, credentials: 'include' };

  // Si el body es JSON string y no hay content-type, setearlo
  if (!headers.has('content-type') && typeof init.body === 'string') {
    try { JSON.parse(init.body as string); headers.set('content-type', 'application/json'); } catch {}
  }
  return final;
}

async function readBody(r: Response): Promise<any> {
  const text = await r.text();
  try { return JSON.parse(text); } catch { return text || null; }
}

/* ---------- helpers JSON ---------- */
export async function getJson<T = any>(path: string): Promise<T> {
  const base = apiBase();
  const r = await fetch(`${base}${path}`, baseInit({ method: 'GET' }));
  const body = await readBody(r);
  if (!r.ok) throw new Error((body && (body.error || body.message)) || `HTTP ${r.status}`);
  const cookieCsrf = readCookie('csrf'); if (cookieCsrf) setCsrf(cookieCsrf);
  return body as T;
}

export async function postJson<T = any>(path: string, payload: unknown): Promise<T> {
  const base = apiBase();
  const r = await fetch(`${base}${path}`, baseInit({ method: 'POST', body: JSON.stringify(payload) }));
  const body = await readBody(r);
  if (!r.ok) throw new Error((body && (body.error || body.message)) || `HTTP ${r.status}`);
  const cookieCsrf = readCookie('csrf'); if (cookieCsrf) setCsrf(cookieCsrf);
  return body as T;
}

/* ---------- AUTH ---------- */
export async function login(email: string, password: string) {
  const data = (await postJson<{ ok?: boolean; token?: string; csrf?: string }>('/auth/login', { email, password })
                  .catch(() => postJson('/login', { email, password }))) as { token?: string; csrf?: string } | {};
  const token = (data as any)?.token as string | undefined;
  const csrf = readCookie('csrf') || (data as any)?.csrf || null;
  if (token) localStorage.setItem('token', token);
  if (csrf) setCsrf(csrf);
  return data;
}

export async function register(email: string, password: string) {
  const data = (await postJson<{ ok?: boolean; token?: string; csrf?: string }>('/auth/signup', { email, password })
                  .catch(() => postJson('/signup', { email, password }))) as { token?: string; csrf?: string } | {};
  const token = (data as any)?.token as string | undefined;
  const csrf = readCookie('csrf') || (data as any)?.csrf || null;
  if (token) localStorage.setItem('token', token);
  if (csrf) setCsrf(csrf);
  return data;
}

export async function logout(): Promise<void> {
  const base = apiBase();
  try { await fetch(`${base}/auth/logout`, baseInit({ method: 'POST' })); } catch {}
  localStorage.removeItem('token');
}

/* ---------- THREADS ---------- */
export async function listThreads(): Promise<Thread[]> {
  const r = await getJson<{ ok: boolean; rows: Thread[] }>('/threads')
         .catch(() => getJson<{ ok: boolean; rows: Thread[] }>('/api/threads'));
  return r?.rows ?? [];
}

export async function createThread(title?: string): Promise<Thread> {
  const r = await postJson<{ ok: boolean; id: string }>('/threads', { title: title || 'Nuevo chat' })
         .catch(() => postJson('/api/threads', { title: title || 'Nuevo chat' }));
  return { _id: String((r as any)?.id), title: title || 'Nuevo chat' };
}

export async function updateThreadTitle(id: string, title: string): Promise<void> {
  const base = apiBase();
  await fetch(`${base}/threads/${encodeURIComponent(id)}`, baseInit({ method: 'PATCH', body: JSON.stringify({ title }) }))
    .catch(async () => { await fetch(`${base}/api/threads/${encodeURIComponent(id)}`, baseInit({ method: 'PATCH', body: JSON.stringify({ title }) })); });
}

export async function deleteThread(id: string): Promise<void> {
  const base = apiBase();
  await fetch(`${base}/threads/${encodeURIComponent(id)}`, baseInit({ method: 'DELETE' }))
    .catch(async () => { await fetch(`${base}/api/threads/${encodeURIComponent(id)}`, baseInit({ method: 'DELETE' })); });
}

/* ---------- MESSAGES ---------- */
export async function listMessages(threadId: string) {
  const qs = threadId ? `?threadId=${encodeURIComponent(threadId)}` : '';
  return await getJson<{ rows: { role: Role, content: string }[] }>(`/messages${qs}`)
    .catch(() => getJson<{ rows: { role: Role, content: string }[] }>(`/api/messages${qs}`));
}

export async function postMessage(threadId: string, role: Role, content: string, toolMeta?: any) {
  try { await postJson('/messages', { threadId, role, content, toolMeta }); }
  catch { await postJson('/api/messages', { threadId, role, content, toolMeta }); }
}

/* ---------- Streaming ---------- */
export async function chatStream(args: {
  threadId: string; message: string; onDelta: (t: string) => void; signal?: AbortSignal;
}) {
  const base = apiBase();
  const headers = new Headers();
  headers.set('accept', 'text/event-stream');
  headers.set('content-type', 'application/json');
  const csrf = CSRF ?? readCookie('csrf') ?? readCookie('csrfToken') ?? readCookie('XSRF-TOKEN');
  if (csrf) headers.set('x-csrf-token', csrf);
  const token = localStorage.getItem('token');
  if (token) headers.set('authorization', `Bearer ${token}`);

  const payload = JSON.stringify({ threadId: args.threadId, content: args.message });
  for (const path of ['/chat', '/api/chat']) {
    try {
      const r = await fetch(`${base}${path}`, { method: 'POST', body: payload, headers, credentials: 'include', signal: args.signal });
      if (!r.ok || !r.body) continue;
      const reader = r.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buffer.indexOf('\n\n')) >= 0) {
          const chunk = buffer.slice(0, idx).trim(); buffer = buffer.slice(idx + 2);
          if (!chunk) continue;
          const line = chunk.split('\n').find(l => l.startsWith('data:'));
          if (!line) continue;
          const json = line.slice(5).trim();
          try {
            const evt = JSON.parse(json);
            if (evt?.type === 'delta') args.onDelta(String(evt.value ?? ''));
            if (evt?.type === 'done') return;
          } catch { args.onDelta(json); }
        }
      }
      return;
    } catch {}
  }
  throw new Error('Streaming no disponible');
}
