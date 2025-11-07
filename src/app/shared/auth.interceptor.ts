import { HttpInterceptorFn, HttpErrorResponse, HttpClient } from "@angular/common/http";
import { Router } from "@angular/router";
import { inject } from "@angular/core";
import { catchError, switchMap, tap, throwError } from "rxjs";
import { environment } from "../../environments/environment";

function readCookie(name: string): string | null {
  const prefix = name + "=";
  const parts = document.cookie.split(";").map(s => s.trim());
  for (const p of parts) if (p.startsWith(prefix)) return decodeURIComponent(p.slice(prefix.length));
  return null;
}

function getToken(): string | null {
  return localStorage.getItem("token") || readCookie("access");
}
function getCsrf(): string | null {
  // priorizar cookie fresca; si no hay, usar localStorage
  return readCookie("csrf") || localStorage.getItem("csrf");
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const http   = inject(HttpClient);
  const BASE   = environment.API_BASE;

  // siempre con credenciales
  let authReq = req.clone({ withCredentials: true });

  // Bearer + CSRF
  const token = getToken();
  const csrf  = getCsrf();
  if (token) authReq = authReq.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  if (csrf)  authReq = authReq.clone({ setHeaders: { "x-csrf-token": csrf } });

  const refreshCsrfOnce = () =>
    http.get<{ csrf?: string }>(`${BASE}/auth/csrf`, { withCredentials: true }).pipe(
      tap((r) => {
        const v = r?.csrf || readCookie("csrf");
        if (v) try { localStorage.setItem("csrf", v); } catch {}
      })
    );

  return next(authReq).pipe(
    catchError((err: HttpErrorResponse) => {
      const status = err.status ?? 0;

      // 401 -> sesión inválida
      if (status === 401) {
        try { localStorage.removeItem("token"); localStorage.removeItem("csrf"); } catch {}
        router.navigateByUrl("/auth");
        return throwError(() => err);
      }

      // 403 -> CSRF faltante/vencido. Refrescar y reintentar una vez.
      if (status === 403) {
        return refreshCsrfOnce().pipe(
          switchMap(() => {
            const freshCsrf = getCsrf();
            let retry = req.clone({ withCredentials: true });
            if (token)     retry = retry.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
            if (freshCsrf) retry = retry.clone({ setHeaders: { "x-csrf-token": freshCsrf } });
            return next(retry);
          }),
          catchError(e2 => throwError(() => e2))
        );
      }

      return throwError(() => err);
    })
  );
};
