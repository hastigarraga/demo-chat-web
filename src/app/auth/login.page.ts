import { Component } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Router, RouterLink } from "@angular/router";
import { AuthService } from "./auth.service";
import { environment } from "../../environments/environment";

@Component({
  standalone: true,
  selector: "app-login",
  templateUrl: "./login.page.html",
  styleUrls: ["./login.page.scss"],
  imports: [CommonModule, FormsModule, RouterLink]
})
export class LoginPage {
  email = "";
  password = "";
  loading = false;
  error = "";

  constructor(private auth: AuthService, private router: Router) {}

  submit() {
    if (this.loading) return;
    this.loading = true;
    this.error = "";

    this.auth.login(this.email, this.password).subscribe({
      next: () => this.router.navigateByUrl("/chat"),
      error: (e) => {
        // el back manda { ok:false, error: "BAD_CREDENTIALS" }
        this.error = e?.error?.error || e?.error?.message || "Login error";
        this.loading = false;
      }
    });
  }

  connectGoogle() {
    this.error = "";

    const email = this.email.trim();
    if (!email) {
      this.error = "Please enter your Google email before continuing.";
      return;
    }

    const base = String(environment.API_BASE || "").replace(/\/+$/, "");
    const url =
      `${base}/workspace/auth/start` +
      `?service=drive` +
      `&user_google_email=${encodeURIComponent(email)}`;

    // redirige al flujo de OAuth de Google Workspace (via MCP)
    window.location.href = url;
  }
}
