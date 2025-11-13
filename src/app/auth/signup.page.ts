import { Component } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Router, RouterModule } from "@angular/router";
import { AuthService } from "./auth.service";

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

  submit() {
    if (this.loading) return;

    const name = this.name.trim();
    const email = this.email.trim();
    const password = this.password.trim();

    if (!email || !password) {
      this.error = "Completá email y password";
      return;
    }

    this.loading = true;
    this.error = "";

    this.auth.signup(name, email, password).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigateByUrl("/chat");
      },
      error: (e) => {
        this.error = e?.error?.error || "Error de registro";
        this.loading = false;
      },
    });
  }
}