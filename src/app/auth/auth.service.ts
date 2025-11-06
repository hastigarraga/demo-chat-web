import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { environment } from "../../environments/environment";
import { tap } from "rxjs/operators";

@Injectable({ providedIn: "root" })
export class AuthService {
  constructor(private http: HttpClient) {}

  login(email: string, password: string) {
    const url = environment.API_BASE + environment.PATHS.login;
    return this.http.post<{access?: string, refresh?: string, user?: any}>(url, { email, password })
      .pipe(tap(res => {
        console.log("[AuthService] login response", res);
        if (res?.access) localStorage.setItem("token", res.access);   // ✅ AHORA GUARDA EL JWT REAL
        if (res?.user) localStorage.setItem("user", JSON.stringify(res.user));
      }));
  }

  signup(name: string, email: string, password: string) {
    const url = environment.API_BASE + environment.PATHS.signup;
    return this.http.post<{access?: string, refresh?: string, user?: any}>(url, { name, email, password })
      .pipe(tap(res => {
        console.log("[AuthService] signup response", res);
        if (res?.access) localStorage.setItem("token", res.access);
        if (res?.user) localStorage.setItem("user", JSON.stringify(res.user));
      }));
  }
}
