import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SidebarThreads } from './sidebar-threads.component';
import {
  listThreads, createThread, renameThread, deleteThread,
  logout, me, login, signup
} from '../api';

@Component({
  standalone: true,
  selector: 'app-shell',
  imports: [RouterOutlet, SidebarThreads, CommonModule, FormsModule],
  template: `
  <div style="display:flex;height:100vh;color:#fff;background:#0f1626">
    <ng-container *ngIf="authed; else authBox">
      <app-sidebar-threads
        [threads]="threads" [selected]="selected"
        (select)="onSelect($event)" (create)="onCreate()"
        (rename)="onRename($event)" (remove)="onRemove($event)"
        (logout)="onLogout()"></app-sidebar-threads>

      <div style="flex:1;overflow:hidden">
        <router-outlet></router-outlet>
      </div>
    </ng-container>

    <ng-template #authBox>
      <div style="margin:auto; width:360px; background:#0b1220; padding:16px; border:1px solid #1f2937; border-radius:8px">
        <h2 style="margin:0 0 12px 0">Ingreso</h2>
        <label>Email</label>
        <input [(ngModel)]="email"
               style="width:100%; padding:8px; margin:6px 0 12px 0; background:#1e293b; color:#fff; border:1px solid #334155; border-radius:6px">
        <label>Password</label>
        <input [(ngModel)]="password" type="password"
               style="width:100%; padding:8px; margin:6px 0 16px 0; background:#1e293b; color:#fff; border:1px solid #334155; border-radius:6px">
        <div style="display:flex; gap:8px">
          <button (click)="doLogin()"
                  style="background:#0EA5E9;border:none;border-radius:8px;padding:10px 12px">Login</button>
          <button (click)="doSignup()"
                  style="background:#10B981;border:none;border-radius:8px;padding:10px 12px">Signup</button>
        </div>
        <div *ngIf="err" style="margin-top:12px;color:#fca5a5">{{err}}</div>
      </div>
    </ng-template>
  </div>
  `
})
export class ShellComponent {
  authed = false;
  threads: any[] = [];
  selected: string | null = null;
  email = '';
  password = '';
  err = '';

  async ngOnInit() {
    await this.checkAuth();
    if (this.authed) await this.refresh();
  }

  private async checkAuth() {
    try { const r = await me(); this.authed = !!r?.ok; }
    catch { this.authed = false; }
  }

  async doLogin() {
    this.err = '';
    try {
      const r = await login(this.email.trim(), this.password.trim());
      if (!r?.ok) throw new Error(r?.error || 'LOGIN_FAILED');
      this.authed = true;
      await this.refresh();
    } catch (e: any) { this.err = e?.message || 'Error'; }
  }

  async doSignup() {
    this.err = '';
    try {
      const r = await signup(this.email.trim(), this.password.trim());
      if (!r?.ok) throw new Error(r?.error || 'SIGNUP_FAILED');
      this.authed = true;
      await this.refresh();
    } catch (e: any) { this.err = e?.message || 'Error'; }
  }

  async refresh() {
    const r = await listThreads();
    this.threads = r.rows || [];
    if (!this.selected && this.threads[0]) this.selected = this.threads[0]._id;
  }

  onSelect(id: string) {
    this.selected = id;
    history.replaceState({}, "", `?t=${id}`);
    window.dispatchEvent(new CustomEvent('thread-selected', { detail: id }));
  }

  async onCreate() {
    const r = await createThread("Nuevo chat");
    await this.refresh();
    const id = r?.row?._id || this.threads[0]?._id || null;
    if (id) this.onSelect(id);
  }

  async onRename(id: string) {
    const t = prompt("Nuevo título");
    if (!t) return;
    await renameThread(id, t);
    await this.refresh();
  }

  async onRemove(id: string) {
    if (!confirm("Eliminar hilo y sus mensajes?")) return;
    await deleteThread(id);
    await this.refresh();
    const next = this.threads[0]?._id || null;
    if (next) this.onSelect(next);
    else {
      this.selected = null;
      history.replaceState({}, "", location.pathname);
      window.dispatchEvent(new CustomEvent('thread-selected', { detail: null }));
    }
  }

  async onLogout() {
    await logout();
    this.authed = false;
    this.threads = [];
    this.selected = null;
  }
}
