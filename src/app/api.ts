const BASE = import.meta.env.VITE_API_BASE_URL;
let CSRF: string | null = null;

export function setCsrf(t:string){ CSRF = t; }
function mutHeaders(){
  const h: Record<string,string> = { "Content-Type":"application/json" };
  if (CSRF) h["X-CSRF-Token"] = CSRF;
  return h;
}

export async function signup(email:string, password:string){
  const r = await fetch(`${BASE}/auth/signup`, { method:"POST", headers:mutHeaders(), credentials:"include", body: JSON.stringify({ email, password }) });
  const j = await r.json(); if (j?.csrf) setCsrf(j.csrf); return j;
}
export async function login(email:string, password:string){
  const r = await fetch(`${BASE}/auth/login`, { method:"POST", headers:mutHeaders(), credentials:"include", body: JSON.stringify({ email, password }) });
  const j = await r.json(); if (j?.csrf) setCsrf(j.csrf); return j;
}
export async function me(){ const r = await fetch(`${BASE}/auth/me`, { credentials:"include" }); return r.json(); }
export async function logout(){ const r = await fetch(`${BASE}/auth/logout`, { method:"POST", credentials:"include" }); return r.json(); }

export async function listThreads(){ const r = await fetch(`${BASE}/threads`, { credentials:"include" }); return r.json(); }
export async function createThread(title:string){ const r = await fetch(`${BASE}/threads`, { method:"POST", headers:mutHeaders(), credentials:"include", body: JSON.stringify({ title }) }); return r.json(); }
export async function renameThread(id:string, title:string){ const r = await fetch(`${BASE}/threads/${id}`, { method:"PUT", headers:mutHeaders(), credentials:"include", body: JSON.stringify({ title }) }); return r.json(); }
export async function deleteThread(id:string){ const r = await fetch(`${BASE}/threads/${id}`, { method:"DELETE", headers:mutHeaders(), credentials:"include" }); return r.json(); }

export async function listMessages(threadId:string){ const r = await fetch(`${BASE}/messages?threadId=${encodeURIComponent(threadId)}`, { credentials:"include" }); return r.json(); }
export async function postMessage(threadId:string, role:"user"|"assistant", content:string){
  const r = await fetch(`${BASE}/messages`, { method:"POST", headers:mutHeaders(), credentials:"include", body: JSON.stringify({ threadId, role, content }) }); return r.json();
}

export async function chatStream(threadId:string, messages:Array<{role:string,content:string}>, onDelta:(d:string)=>void){
  const r = await fetch(`${BASE}/chat`, { method:"POST", headers:mutHeaders(), credentials:"include", body: JSON.stringify({ threadId, messages }) });
  const reader = r.body!.getReader(); const dec = new TextDecoder();
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    const s = dec.decode(value);
    for (const line of s.split("\n")) {
      if (line.startsWith("data: ")) {
        const chunk = line.slice(6);
        if (chunk === "[DONE]") return;
        onDelta(chunk);
      }
    }
  }
}
