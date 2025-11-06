import { bootstrapApplication } from "@angular/platform-browser";
import { provideRouter } from "@angular/router";
import { provideHttpClient, withInterceptors } from "@angular/common/http";
import { AppComponent } from "./app/app.component";
import { routes } from "./app/app.routes";
import { authInterceptor } from "./app/shared/auth.interceptor";

// Espera a que el DOM tenga <app-root> presente
const start = () => bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
  ],
}).catch(err => console.error("[bootstrap] error:", err));

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", start, { once: true });
} else {
  start();
}
