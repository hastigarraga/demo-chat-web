// src/app/shared/auth.interceptor.ts
import { HttpInterceptorFn } from "@angular/common/http";
import { environment } from "../../environments/environment";

function readCookie(name: string): string | null {
  const m = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/[-[\]{}()*+?.,\\^$|#\\s]/g, '\\$&') + '=([^;]*)'));
  return m ? decodeURIComponent(m[1]) : null;
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  let clone = req.clone({ withCredentials: true });  // <— SIEMPRE

  const token = localStorage.getItem("token");
  if (environment.USE_BEARER && token) {
    clone = clone.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }

  const csrf = localStorage.getItem("csrf") || readCookie("csrf");
  if (csrf) clone = clone.clone({ setHeaders: { "x-csrf-token": csrf } });

  return next(clone);
};
