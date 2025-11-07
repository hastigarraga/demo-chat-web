import { bootstrapApplication } from "@angular/platform-browser";
import { provideRouter } from "@angular/router";
import { provideHttpClient, withInterceptors, HttpClient } from "@angular/common/http";
import { AppComponent } from "./app/app.component";
import { routes } from "./app/app.routes";
import { authInterceptor } from "./app/shared/auth.interceptor";
import { environment } from "./environments/environment";

function readCookie(name: string): string | null {
  const m = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/[-[\]{}()*+?.,\\^$|#\\s]/g, '\\$&') + '=([^;]*)'));
  return m ? decodeURIComponent(m[1]) : null;
}
function hydrateAuthFromCookies() {
  try {
    const t = localStorage.getItem("token");
    const cAccess = readCookie("access");
    if (!t && cAccess) localStorage.setItem("token", cAccess);
    const cCsrf = readCookie("csrf");
    if (cCsrf) localStorage.setItem("csrf", cCsrf);
  } catch {}
}

// Prefetch de CSRF si falta
async function prefetchCsrfIfMissing() {
  const has = readCookie("csrf") || localStorage.getItem("csrf");
  if (has) return;
  try {
    const res = await fetch(`${environment.API_BASE}/auth/csrf`, { credentials: "include" });
    const j = await res.json().catch(()=> ({}));
    if (j?.csrf) localStorage.setItem("csrf", j.csrf);
  } catch {}
}

hydrateAuthFromCookies();

const start = async () => {
  await prefetchCsrfIfMissing();

  bootstrapApplication(AppComponent, {
    providers: [
      provideRouter(routes),
      provideHttpClient(withInterceptors([authInterceptor])),
    ],
  }).catch(err => console.error("[bootstrap] error:", err));
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", start);
} else {
  start();
}
