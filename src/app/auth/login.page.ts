import { Component } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Router, RouterLink } from "@angular/router";
import { AuthService } from "./auth.service";

@Component({
  standalone: true,
  selector: "app-login",
  templateUrl: "./login.page.html",
  styleUrls: ["./login.page.scss"],
  imports: [CommonModule, FormsModule, RouterLink],
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
        const code = e?.error?.error || e?.error?.message || e?.message;

        if (code === "BAD_CREDENTIALS") {
          this.error = "Email o contraseña incorrectos";
        } else if (code === "BAD_INPUT") {
          this.error = "Completá email y contraseña";
        } else {
          this.error = "Error de login";
        }

        this.loading = false;
      },
    });
  }
}
