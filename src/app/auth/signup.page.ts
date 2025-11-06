import { Component } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { AuthService } from "./auth.service";

@Component({
  standalone: true,
  selector: "app-signup",
  templateUrl: "./signup.page.html",
  styleUrls: ["./signup.page.scss"],
  imports: [CommonModule, FormsModule]
})
export class SignupPage {
  name = "";
  email = "";
  password = "";
  loading = false;
  error = "";

  constructor(private auth: AuthService, private router: Router) {}

  submit() {
    if (this.loading) return;

    const email = this.email.trim();
    const password = this.password.trim();
    if (!email || !password) {
      this.error = "Completá email y password";
      return;
    }

    this.loading = true;
    this.error = "";

    this.auth.signup(email, password).subscribe({
      next: () => this.router.navigateByUrl("/chat"),
      error: (e) => {
        // el backend devuelve { ok:false, error: "..." }
        this.error = e?.error?.error || "Error de registro";
        this.loading = false;
      }
    });
  }
}
