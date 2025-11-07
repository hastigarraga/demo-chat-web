import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { environment } from "../../environments/environment";
import { tap } from "rxjs/operators";
import { Observable } from "rxjs";

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

  login(email: string, password: string): Observable<any> {
    return this.http
      .post(`${this.base}/auth/login`, { email, password }, { withCredentials: true })
      .pipe(
        tap((res: any) => {
          // backend devuelve { ok, access, csrf, user }
          const access = res?.access || readCookie("access");
          const csrf   = res?.csrf   || readCookie("csrf");
          if (access) localStorage.setItem("token", access);
          if (csrf)   localStorage.setItem("csrf", csrf);
          console.log("[AuthService] login response", { hasAccess: !!access, hasCsrf: !!csrf });
        })
      );
  }

  signup(name: string, email: string, password: string): Observable<any> {
    return this.http
      .post(`${this.base}/auth/signup`, { name, email, password }, { withCredentials: true })
      .pipe(
        tap((res: any) => {
          const access = res?.access || readCookie("access");
          const csrf   = res?.csrf   || readCookie("csrf");
          if (access) localStorage.setItem("token", access);
          if (csrf)   localStorage.setItem("csrf", csrf);
          console.log("[AuthService] signup response", { hasAccess: !!access, hasCsrf: !!csrf });
        })
      );
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
