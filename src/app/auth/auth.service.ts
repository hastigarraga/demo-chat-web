import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { environment } from "../../environments/environment";
import { tap } from "rxjs/operators";
import { Observable, of } from "rxjs";

function readCookie(name: string): string | null {
  const m = document.cookie.match(
    new RegExp('(?:^|; )' + name.replace(/[-[\]{}()*+?.,\\^$|#\\s]/g, "\\$&") + "=([^;]*)")
  );
  return m ? decodeURIComponent(m[1]) : null;
}

@Injectable({ providedIn: "root" })
export class AuthService {
  private base = environment.API_BASE;

  constructor(private http: HttpClient) {}

  private stashAuth(res: any) {
    const access = res?.access || readCookie("access");
    const csrf   = res?.csrf   || readCookie("csrf");
    if (access) localStorage.setItem("token", access);
    if (csrf)   localStorage.setItem("csrf", csrf);
  }

  /** Helper por si en algún punto necesitás forzar un CSRF nuevo */
  private ensureCsrf(): Observable<any> {
    const has = readCookie("csrf") || localStorage.getItem("csrf");
    if (has) return of({ ok: true, csrf: has });

    return this.http
      .get<{ ok: boolean; csrf?: string }>(`${this.base}/auth/csrf`, { withCredentials: true })
      .pipe(
        tap((j) => {
          if (j?.csrf) localStorage.setItem("csrf", j.csrf);
        })
      );
  }

  /** Login: SOLO hace POST /auth/login y guarda access + csrf. */
  login(email: string, password: string): Observable<any> {
    return this.http
      .post(`${this.base}/auth/login`, { email, password }, { withCredentials: true })
      .pipe(tap((res) => this.stashAuth(res)));
  }

  /** Signup: igual, una sola request. */
  signup(name: string, email: string, password: string): Observable<any> {
    return this.http
      .post(`${this.base}/auth/signup`, { name, email, password }, { withCredentials: true })
      .pipe(tap((res) => this.stashAuth(res)));
  }

  me(): Observable<any> {
    return this.http.get(`${this.base}/auth/me`, { withCredentials: true });
  }

  logout(): void {
    try {
      localStorage.removeItem("token");
      localStorage.removeItem("csrf");
    } catch {}
  }
}
