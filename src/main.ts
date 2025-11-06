import { bootstrapApplication } from "@angular/platform-browser";
import { provideRouter } from "@angular/router";
import { provideHttpClient, withInterceptors } from "@angular/common/http";
import { AppComponent } from "./app/app.component";
import { routes } from "./app/app.routes";
import { authInterceptor } from "./app/shared/auth.interceptor";

// === Hidratación de auth desde cookies (arranque) ===
function readCookie(name: string): string | null {
  const m = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/[-[\]{}()*+?.,\\^$|#\\s]/g, '\\$&') + '=([^;]*)'));
  return m ? decodeURIComponent(m[1]) : null;
}
function hydrateAuthFromCookies() {
  try {
    const t = localStorage.getItem("token");
    const cAccess = readCookie("access");
    if (!t && cAccess) {
      localStorage.setItem("token", cAccess);
      console.log("[bootstrap] hydrated token from cookie");
    }
    const cCsrf = readCookie("csrf");
    if (cCsrf) localStorage.setItem("csrf", cCsrf);
  } catch {}
}
hydrateAuthFromCookies();

// Espera a que el DOM tenga <app-root> presente
const start = () => bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
  ],
}).catch(err => console.error("[bootstrap] error:", err));

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", start);
} else {
  start();
}
