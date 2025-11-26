import { Injectable } from "@angular/core";
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { environment } from "../../environments/environment";
import { map } from "rxjs/operators";

function readCookie(name: string): string | null {
  const m = document.cookie.match(
    new RegExp('(?:^|; )' + name.replace(/[-[\]{}()*+?.,\\^$|#\\s]/g, '\\$&') + '=([^;]*)')
  );
  return m ? decodeURIComponent(m[1]) : null;
}

function authHeaders(): HttpHeaders {
  const token = localStorage.getItem("token") || readCookie("access") || "";
  const csrf  = localStorage.getItem("csrf")  || readCookie("csrf")  || "";
  let h = new HttpHeaders({ "content-type": "application/json" });
  if (token) h = h.set("Authorization", `Bearer ${token}`);
  if (csrf)  h = h.set("x-csrf-token", csrf);
  return h;
}

const BASE = environment.API_BASE;
const PATHS = environment.PATHS;

@Injectable({ providedIn: "root" })
export class ChatService {
  constructor(private http: HttpClient) {}

  listThreads() {
    return this.http.get<{ok:boolean, rows:any[]}>(BASE + PATHS.threads_list, {
      withCredentials: true,
      headers: authHeaders(),
    });
  }

  lastActive() {
    return this.http.get<{ok:boolean, row:any}>(BASE + PATHS.threads_last, {
      withCredentials: true,
      headers: authHeaders(),
    });
  }

  getThread(id: string) {
    return this.http.get<{ok:boolean, row:any, messages:any[]}>(BASE + PATHS.thread_by_id(id), {
      withCredentials: true,
      headers: authHeaders(),
    });
  }

  createThread(title?: string) {
    return this.http.post<{ok:boolean, row:any}>(BASE + PATHS.threads_list, { title: title || "Nuevo chat" }, {
      withCredentials: true,
      headers: authHeaders(),
    });
  }

  renameThread(id: string, title: string) {
    return this.http.put<{ok:boolean}>(BASE + PATHS.thread_by_id(id), { title }, {
      withCredentials: true,
      headers: authHeaders(),
    });
  }

  deleteThread(id: string) {
    return this.http.delete<{ok:boolean}>(BASE + PATHS.thread_by_id(id), {
      withCredentials: true,
      headers: authHeaders(),
    });
  }

  sendMessage(threadId: string | null, content: string) {
    return this.http.post<{ok:boolean, thread:any, messages:any[]}>(BASE + PATHS.messages, { threadId, content }, {
      withCredentials: true,
      headers: authHeaders(),
    });
  }

  generateSmartTitle(seed: string) {
    return this.http.post<{ ok: boolean; title: string }>(
      BASE + PATHS.utils_title,
      { seed },
      { withCredentials: true, headers: authHeaders() }
    ).pipe(map(r => (r?.title ?? "").trim()));
  }

  // ===== Workspace OAuth status/control =====
  workspaceStatus() {
    return this.http.get<{ ok: boolean; connected: boolean; email: string | null }>(
      BASE + "/workspace/status",
      { withCredentials: true, headers: authHeaders() }
    );
  }

  workspaceDisconnect() {
    return this.http.post<{ ok: boolean }>(
      BASE + "/workspace/disconnect",
      {},
      { withCredentials: true, headers: authHeaders() }
    );
  }
}
