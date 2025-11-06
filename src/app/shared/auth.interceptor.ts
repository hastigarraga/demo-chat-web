import { HttpInterceptorFn } from "@angular/common/http";
import { environment } from "../../environments/environment";

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  let clone = req;
  // Fallback: acepta cookie httpOnly o Bearer si existe
  if (environment.WITH_CREDENTIALS) clone = clone.clone({ withCredentials: true });
  if (environment.USE_BEARER) {
    const token = localStorage.getItem("token");
    if (token) clone = clone.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }
  return next(clone);
};
