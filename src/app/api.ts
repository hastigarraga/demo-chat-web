const rawBase = (import.meta.env.VITE_API_BASE_URL ?? '').trim();
const BASE = rawBase ? rawBase.replace(/\/+$/, '') : '';
let CSRF: string | null = null;

export function setCsrf(token: string) {
  CSRF = token;
}

function ensureBase() {
  if (!BASE) {
    throw new Error('Falta configurar VITE_API_BASE_URL en el frontend.');
  }
  return BASE;
}

function buildInit(init: RequestInit = {}) {
  const headers = new Headers(init.headers ?? {});
  const hasBody = init.body !== undefined && init.body !== null;
  const method = init.method ? init.method.toUpperCase() : undefined;

  if (hasBody && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (CSRF) {
    headers.set('X-CSRF-Token', CSRF);
  }

  const finalInit: RequestInit = {
    ...init,
    headers,
    credentials: 'include',
  };

  if (method) {
    finalInit.method = method;
  }

  return finalInit;
}

async function readBody(response: Response) {
  const contentType = response.headers.get('content-type') ?? '';
  try {
    if (contentType.includes('application/json')) {
      return await response.json();
    }
    const text = await response.text();
    if (!text) {
      return null;
    }
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  } catch {
    return null;
  }
}

function extractMessage(payload: unknown, fallback: string) {
  if (!payload) {
    return fallback;
  }
  if (typeof payload === 'string' && payload.trim()) {
    return payload.trim();
  }
  if (typeof payload === 'object') {
    const maybe =
      (payload as any)?.error ??
      (payload as any)?.message ??
      (payload as any)?.detail ??
      (payload as any)?.errors;
    if (typeof maybe === 'string' && maybe.trim()) {
      return maybe.trim();
    }
    if (Array.isArray(maybe) && maybe.length && typeof maybe[0] === 'string') {
      return maybe[0];
    }
  }
  return fallback;
}

async function requestJson(path: string, init: RequestInit = {}) {
  try {
    const response = await fetch(`${ensureBase()}${path}`, buildInit(init));
    const body = await readBody(response);
    if (body && typeof body === 'object' && 'csrf' in body && (body as any).csrf) {
      setCsrf((body as any).csrf);
    }
    if (!response.ok) {
      throw new Error(extractMessage(body, `Error ${response.status}`));
    }

    if (body && typeof body === 'object') {
      const record = body as Record<string, unknown>;
      const negativeFlags = [
        record.ok === false,
        record.success === false,
        typeof record.error === 'string' && record.error.trim().length > 0,
      ];
      if (negativeFlags.some(Boolean)) {
        throw new Error(extractMessage(body, 'La operación no se pudo completar.'));
      }
    }

    return body ?? {};
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : 'No se pudo completar la petición.';
    throw new Error(message);
  }
}

export async function signup(email: string, password: string) {
  return requestJson('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function login(email: string, password: string) {
  return requestJson('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function me() {
  return requestJson('/auth/me');
}

export async function logout() {
  return requestJson('/auth/logout', { method: 'POST' });
}

export async function listThreads() {
  return requestJson('/threads');
}

export async function createThread(title: string) {
  return requestJson('/threads', {
    method: 'POST',
    body: JSON.stringify({ title }),
  });
}

export async function renameThread(id: string, title: string) {
  return requestJson(`/threads/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ title }),
  });
}

export async function deleteThread(id: string) {
  return requestJson(`/threads/${id}`, {
    method: 'DELETE',
  });
}

export async function listMessages(threadId: string) {
  return requestJson(`/messages?threadId=${encodeURIComponent(threadId)}`);
}

export async function postMessage(
  threadId: string,
  role: 'user' | 'assistant',
  content: string
) {
  return requestJson('/messages', {
    method: 'POST',
    body: JSON.stringify({ threadId, role, content }),
  });
}

export async function chatStream(
  threadId: string,
  messages: Array<{ role: string; content: string }>,
  onDelta: (chunk: string) => void,
  options: { signal?: AbortSignal } = {}
) {
  const init = buildInit({
    method: 'POST',
    body: JSON.stringify({ threadId, messages }),
    signal: options.signal,
  });

  let response: Response;
  try {
    response = await fetch(`${ensureBase()}/chat`, init);
  } catch (error) {
    throw new Error(
      error instanceof Error && error.message
        ? error.message
        : 'No se pudo iniciar el streaming de chat.'
    );
  }
  if (!response.ok || !response.body) {
    const payload = await readBody(response);
    throw new Error(extractMessage(payload, 'No se pudo generar la respuesta.'));
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  const flush = () => {
    let index: number;
    while ((index = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, index).replace(/\r$/, '');
      buffer = buffer.slice(index + 1);
      if (!line.trim() || !line.startsWith('data: ')) {
        continue;
      }
      const chunk = line.slice(6).trim();
      if (!chunk) {
        continue;
      }
      if (chunk === '[DONE]') {
        buffer = '';
        return true;
      }
      onDelta(chunk);
    }
    return false;
  };

  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }
    buffer += decoder.decode(value, { stream: true });
    if (flush()) {
      return;
    }
  }

  buffer += decoder.decode();
  if (flush()) {
    return;
  }

  const trimmed = buffer.trim();
  if (trimmed.startsWith('data: ')) {
    const chunk = trimmed.slice(6).trim();
    if (chunk && chunk !== '[DONE]') {
      onDelta(chunk);
    }
  }
}
