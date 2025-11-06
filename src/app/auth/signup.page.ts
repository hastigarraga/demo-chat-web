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
  name=""; email=""; password=""; loading=false; error="";

  constructor(private auth: AuthService, private router: Router) {}

  submit() {
    if (this.loading) return;
    this.loading = true; this.error = "";
    this.auth.signup(this.name, this.email, this.password).subscribe({
      next: () => this.router.navigateByUrl("/chat"),
      error: (e) => { this.error = e?.error?.message || "Error de registro"; this.loading = false; }
    });
  }
}
