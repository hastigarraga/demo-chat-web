import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { environment } from "../../environments/environment";
import { tap } from "rxjs/operators";
import { Observable, of } from "rxjs";

function readCookie(name: string): string | null {
  const m = document.cookie.match(
    new RegExp('(?:^|; )' + name.replace(/[-[\]{}()*+?.,\\^$|#\\s]/g, '\\$&') + '=([^;]*)')
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

  /** Login: una sola request a /auth/login. */
  login(email: string, password: string): Observable<any> {
    return this.http
      .post(`${this.base}/auth/login`, { email, password }, { withCredentials: true })
      .pipe(tap((res) => this.stashAuth(res)));
  }

  /** Signup: idem. */
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
