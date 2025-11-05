import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { login } from '../api';

@Component({
  standalone: true,
  selector: 'app-login',
  imports: [CommonModule, FormsModule],
  template: `
  <div class="content" style="display:flex;justify-content:center;padding:24px">
    <div style="width:100%;max-width:360px">
      <h1 style="margin:0 0 12px 0">Iniciar sesión</h1>

      <form (ngSubmit)="doLogin()" novalidate style="display:grid;gap:8px">
        <input class="input"
               name="email"
               [(ngModel)]="email"
               type="email"
               placeholder="Email"
               [disabled]="busy"
               required
               autocomplete="username" />
        <input class="input"
               name="password"
               [(ngModel)]="password"
               type="password"
               placeholder="Password"
               [disabled]="busy"
               required
               autocomplete="current-password" />
        <button class="btn primary" type="submit" [disabled]="busy || !valid()">
          <span *ngIf="!busy">Entrar</span>
          <span *ngIf="busy" class="spinner"></span>
        </button>
      </form>

      <div *ngIf="err" style="margin-top:8px;color:#fca5a5">{{err}}</div>
      <div *ngIf="hint" style="margin-top:6px;color:#94a3b8;font-size:12px">{{hint}}</div>
    </div>
  </div>
  `
})
export class LoginPage {
  email = '';
  password = '';
  busy = false;
  err = '';
  hint = '';

  constructor(private router: Router) {}

  valid() {
    return this.email.includes('@') && this.password.length >= 3;
  }

  async doLogin() {
    if (this.busy || !this.valid()) return;
    this.busy = true; this.err = ''; this.hint = '';
    try {
      await login(this.email.trim(), this.password);
      this.router.navigateByUrl('/');
    } catch (e: any) {
      const raw = (e?.message || '').toUpperCase();

      // Mensajes claros para los casos comunes
      if (raw.includes('NO_AUTH') || raw.includes('UNAUTHORIZED') || raw.includes('401')) {
        this.err = 'Credenciales inválidas.';
      } else if (raw.includes('BAD_INPUT') || raw.includes('400') || raw.includes('VALIDATION')) {
        this.err = 'El servidor rechazó el formato. Probá de nuevo.';
        this.hint = 'Probé JSON y x-www-form-urlencoded en /auth/login y /login. Si tu API usa otra ruta o keys (p.ej. username/pass), decime y lo ajusto.';
      } else {
        this.err = e?.message || 'Error de login.';
      }
    } finally {
      this.busy = false;
    }
  }
}
