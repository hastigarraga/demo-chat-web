import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { environment } from "../../environments/environment";
import { tap, catchError } from "rxjs/operators";
import { Observable, throwError } from "rxjs";

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

  /**
   * Login “inteligente”:
   *  1) Intenta POST /auth/login
   *  2) Si da BAD_CREDENTIALS, intenta automáticamente /auth/signup
   *     (auto-crea el usuario si no existía)
   */
  login(email: string, password: string): Observable<any> {
    return this.http
      .post(`${this.base}/auth/login`, { email, password }, { withCredentials: true })
      .pipe(
        tap((res) => this.stashAuth(res)),
        catchError((e) => {
          const code = e?.error?.error || e?.error?.message || e?.message;

          if (code === "BAD_CREDENTIALS") {
            // puede ser usuario que no existe -> probamos crear cuenta
            return this.http
              .post(
                `${this.base}/auth/signup`,
                { name: "", email, password },
                { withCredentials: true }
              )
              .pipe(
                tap((res2) => this.stashAuth(res2)),
                catchError((e2) => {
                  // si acá da 409 (EMAIL_IN_USE), es realmente pass incorrecta
                  return throwError(() => e2);
                })
              );
          }

          return throwError(() => e);
        })
      );
  }

  /** Signup explícito desde la pantalla de registro */
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
