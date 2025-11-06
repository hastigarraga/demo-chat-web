// src/app/shared/auth.interceptor.ts
import { HttpInterceptorFn, HttpErrorResponse } from "@angular/common/http";
import { Router } from "@angular/router";
import { inject } from "@angular/core";
import { catchError } from "rxjs/operators";
import { throwError } from "rxjs";

function readCookie(name: string): string | null {
  const m = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/[-[\]{}()*+?.,\\^$|#\\s]/g, '\\$&') + '=([^;]*)'));
  return m ? decodeURIComponent(m[1]) : null;
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);

  // Siempre con credenciales
  const withCreds = req.clone({ withCredentials: true });

  // Adjuntar Bearer + CSRF
  const token = localStorage.getItem("token") || readCookie("access");
  const csrf  = localStorage.getItem("csrf")  || readCookie("csrf");

  let authReq = withCreds;
  if (token) authReq = authReq.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  if (csrf)  authReq = authReq.clone({ setHeaders: { "x-csrf-token": csrf } });

  const clear = () => { try { localStorage.removeItem("token"); } catch {} };

  return next(authReq).pipe(
    catchError((err: HttpErrorResponse) => {
      const status = err?.status ?? 0;
      const bodyStr = typeof err?.error === "string" ? err.error : JSON.stringify(err?.error || "");
      const upper = bodyStr.toUpperCase();

      // Reintento único para 401/403 releyendo cookies
      if (status === 401 || status === 403) {
        const freshToken = readCookie("access");
        const freshCsrf  = readCookie("csrf");

        let retryReq = req.clone({ withCredentials: true });
        if (freshToken) retryReq = retryReq.clone({ setHeaders: { Authorization: `Bearer ${freshToken}` } });
        if (freshCsrf)  retryReq = retryReq.clone({ setHeaders: { "x-csrf-token": freshCsrf } });
        if (freshToken) { try { localStorage.setItem("token", freshToken); } catch {} }

        // Si no hay credenciales frescas o el retry falla, a /auth
        if (!freshToken && status === 401) {
          clear(); router.navigateByUrl("/auth");
          return throwError(() => err);
        }

        return next(retryReq).pipe(
          catchError((e2: HttpErrorResponse) => {
            clear(); router.navigateByUrl("/auth");
            return throwError(() => e2);
          })
        );
      }

      if (status === 401 && upper.includes("INVALID_AUTH")) {
        clear(); router.navigateByUrl("/auth");
      }

      return throwError(() => err);
    })
  );
};
