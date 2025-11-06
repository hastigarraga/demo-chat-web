import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { environment } from "../../environments/environment";
import { tap } from "rxjs/operators";

@Injectable({ providedIn: "root" })
export class AuthService {
  constructor(private http: HttpClient) {}

  login(email: string, password: string) {
    const url = environment.API_BASE + environment.PATHS.login;
    return this.http.post<{ok:boolean, access?:string, user?:any, csrf?:string}>(url, { email, password })
      .pipe(tap(res => {
        console.log("[AuthService] login response", res);
        if (res?.access) localStorage.setItem("token", res.access);
        if (res?.csrf) localStorage.setItem("csrf", res.csrf);
      }));
  }

  signup(email: string, password: string) {
    const url = environment.API_BASE + environment.PATHS.signup;
    return this.http.post<{ok:boolean, access?:string, user?:any, csrf?:string}>(url, { email, password })
      .pipe(tap(res => {
        console.log("[AuthService] signup response", res);
        if (res?.access) localStorage.setItem("token", res.access);
        if (res?.csrf) localStorage.setItem("csrf", res.csrf);
      }));
  }

  logout() {
    localStorage.removeItem("token"); localStorage.removeItem("csrf");
  }
}
