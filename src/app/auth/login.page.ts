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
        this.error = e?.error?.message || "Error de login";
        this.loading = false;
      }
    });
  }

  connectGoogle() {
    const base = environment.API_BASE.replace(/\/+$/, "");
    const url = `${base}/workspace/auth/start?service=drive`;
    window.location.href = url;
  }
}
