import { Component } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Router, RouterModule } from "@angular/router";
import { AuthService } from "./auth.service";
import { environment } from "../../environments/environment";

@Component({
  standalone: true,
  selector: "app-signup",
  templateUrl: "./signup.page.html",
  styleUrls: ["./signup.page.scss"],
  imports: [CommonModule, FormsModule, RouterModule],
})
export class SignupPage {
  name = "";
  email = "";
  password = "";
  loading = false;
  error = "";

  constructor(private auth: AuthService, private router: Router) {}

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

    window.location.href = url;
  }

  submit() {
    if (this.loading) return;

    const { name, email, password } = this;
    if (!email || !password) {
      this.error = "Completá email y password";
      return;
    }

    this.loading = true;
    this.error = "";

    this.auth.signup(name, email, password).subscribe({
      next: async () => {
        try {
          await this.auth.me().toPromise();
        } catch {}
        this.router.navigateByUrl("/chat");
      },
      error: (e) => {
        this.error = e?.error?.error || "Error de registro";
        this.loading = false;
      },
    });
  }
}
