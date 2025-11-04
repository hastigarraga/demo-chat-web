import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SidebarThreads } from './sidebar-threads.component';
import {
  listThreads,
  createThread,
  renameThread,
  deleteThread,
  logout,
  me,
  login,
  signup,
} from '../api';

type Thread = { _id: string; title: string };

@Component({
  standalone: true,
  selector: 'app-shell',
  imports: [RouterOutlet, SidebarThreads, CommonModule, FormsModule],
  template: `
    <div class="shell">
      <ng-container *ngIf="authed; else authBox">
        <app-sidebar-threads
          [threads]="threads"
          [selected]="selected"
          [busy]="threadsBusy"
          (select)="onSelect($event)"
          (create)="onCreate()"
          (rename)="onRename($event)"
          (remove)="onRemove($event)"
          (logout)="onLogout()"
        ></app-sidebar-threads>

        <div class="shell__content">
          <header class="shell__header">
            <div>
              <h1 class="shell__title">Tu asistente conversacional</h1>
              <p class="text-dimmed shell__subtitle">
                Gestioná tus hilos y retomá la conversación cuando quieras.
              </p>
            </div>
            <span class="shell__status" *ngIf="threadsBusy">Sincronizando…</span>
          </header>

          <div class="shell__error" *ngIf="threadsError">{{ threadsError }}</div>

          <div class="shell__router">
            <router-outlet></router-outlet>
          </div>
        </div>
      </ng-container>

      <ng-template #authBox>
        <div class="shell__auth">
          <div class="card auth">
            <h1 class="auth__title">Bienvenido</h1>
            <p class="auth__subtitle text-dimmed">
              Iniciá sesión o creá tu cuenta para empezar a chatear.
            </p>

            <form class="auth__form" (submit)="submitAuth($event)">
              <label class="auth__label" for="email">Correo electrónico</label>
              <input
                id="email"
                name="email"
                type="email"
                class="input"
                autocomplete="email"
                placeholder="nombre@dominio.com"
                [(ngModel)]="email"
                [disabled]="authBusy"
                required
              />

              <label class="auth__label" for="password">Contraseña</label>
              <input
                id="password"
                name="password"
                type="password"
                class="input"
                autocomplete="current-password"
                placeholder="Mínimo 6 caracteres"
                [(ngModel)]="password"
                [disabled]="authBusy"
                required
                minlength="6"
              />

              <div class="auth__actions">
                <button
                  type="submit"
                  class="btn btn-primary"
                  name="mode"
                  value="login"
                  [disabled]="authBusy"
                >
                  Iniciar sesión
                </button>
                <button
                  type="submit"
                  class="btn btn-secondary"
                  name="mode"
                  value="signup"
                  [disabled]="authBusy"
                >
                  Crear cuenta
                </button>
              </div>
            </form>

            <p class="auth__hint text-dimmed">
              Usamos cookies seguras para mantener tu sesión activa.
            </p>
            <div class="auth__error" *ngIf="err">{{ err }}</div>
          </div>
        </div>
      </ng-template>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        height: 100%;
        width: 100%;
      }

      .shell {
        display: flex;
        height: 100%;
        width: 100%;
        background: radial-gradient(circle at top, rgba(37, 99, 235, 0.18), transparent 60%),
          radial-gradient(circle at bottom right, rgba(8, 47, 73, 0.25), transparent 55%),
          #020617;
      }

      .shell__content {
        flex: 1;
        min-width: 0;
        padding: 2rem 2.5rem;
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }

      .shell__header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 1rem;
      }

      .shell__title {
        margin: 0;
        font-size: 1.75rem;
      }

      .shell__subtitle {
        margin: 0.35rem 0 0 0;
      }

      .shell__status {
        align-self: center;
        padding: 0.35rem 0.75rem;
        border-radius: 999px;
        border: 1px solid rgba(59, 130, 246, 0.35);
        background: rgba(37, 99, 235, 0.12);
        color: rgba(191, 219, 254, 0.9);
        font-size: 0.85rem;
        font-weight: 600;
      }

      .shell__error {
        padding: 0.85rem 1.1rem;
        border-radius: 1rem;
        border: 1px solid rgba(248, 113, 113, 0.45);
        background: rgba(248, 113, 113, 0.12);
        color: #fecaca;
        font-size: 0.95rem;
      }

      .shell__router {
        flex: 1;
        min-height: 0;
        border-radius: 1.75rem;
        border: 1px solid rgba(15, 23, 42, 0.65);
        background: rgba(8, 11, 25, 0.75);
        box-shadow: inset 0 1px 0 rgba(148, 163, 184, 0.05);
        overflow: hidden;
        display: flex;
        flex-direction: column;
      }

      .shell__auth {
        margin: auto;
        padding: 2rem;
      }

      .auth {
        max-width: 420px;
        width: 100%;
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }

      .auth__title {
        margin: 0;
        font-size: 2rem;
      }

      .auth__subtitle {
        margin: 0;
      }

      .auth__form {
        display: flex;
        flex-direction: column;
        gap: 0.9rem;
      }

      .auth__label {
        font-weight: 600;
        font-size: 0.95rem;
      }

      .auth__actions {
        display: flex;
        gap: 0.75rem;
        margin-top: 0.5rem;
        flex-wrap: wrap;
      }

      .auth__hint {
        margin: -0.5rem 0 0 0;
        font-size: 0.85rem;
      }

      .auth__error {
        margin-top: -0.5rem;
        color: #fca5a5;
        font-weight: 600;
      }

      @media (max-width: 960px) {
        .shell {
          flex-direction: column;
        }

        app-sidebar-threads {
          order: 2;
          width: 100%;
          height: 320px;
        }

        .shell__content {
          order: 1;
          padding: 1.5rem;
        }
      }
    `,
  ],
})
export class ShellComponent {
  authed = false;
  threads: Thread[] = [];
  selected: string | null = null;
  email = '';
  password = '';
  err = '';
  authBusy = false;
  threadsBusy = false;
  threadsError = '';

  async ngOnInit() {
    await this.checkAuth();
    if (this.authed) {
      await this.loadThreads();
    } else {
      this.pushSelection(null, true);
    }
  }

  private async checkAuth() {
    try {
      const response = await me();
      this.authed = this.isPositive(response);
    } catch {
      this.authed = false;
    }
  }

  async submitAuth(ev: SubmitEvent) {
    ev.preventDefault();
    if (this.authBusy) {
      return;
    }

    const submitter = ev.submitter as HTMLButtonElement | null;
    const mode = submitter?.value === 'signup' ? 'signup' : 'login';
    const email = this.email.trim();
    const password = this.password;

    if (!email || !password) {
      this.err = 'Completá tu email y contraseña.';
      return;
    }

    this.err = '';
    this.authBusy = true;

    try {
      const action = mode === 'signup' ? signup : login;
      const response = await action(email, password);
      if (!this.isPositive(response)) {
        const message = (response as any)?.error || (response as any)?.message;
        throw new Error(
          message || (mode === 'signup' ? 'No se pudo crear la cuenta.' : 'No se pudo iniciar sesión.')
        );
      }

      this.authed = true;
      this.email = '';
      this.password = '';
      await this.loadThreads();
    } catch (error) {
      this.err = this.formatError(
        error,
        mode === 'signup' ? 'No se pudo crear la cuenta.' : 'No se pudo iniciar sesión.'
      );
    } finally {
      this.authBusy = false;
    }
  }

  async loadThreads(preferredId?: string | null) {
    this.threadsBusy = true;
    this.threadsError = '';
    try {
      await this.syncThreads(preferredId ?? null);
    } catch (error) {
      this.threads = [];
      this.threadsError = this.formatError(error, 'No se pudieron cargar tus hilos.');
      this.pushSelection(null, true);
    } finally {
      this.threadsBusy = false;
    }
  }

  private async syncThreads(preferredId: string | null) {
    const response = await listThreads();
    const rows = Array.isArray(response?.rows) ? (response.rows as Thread[]) : [];
    this.threads = rows;

    const exists = (id?: string | null) => !!id && this.threads.some((t) => t._id === id);
    const urlId = new URLSearchParams(location.search).get('t');
    const candidates: Array<string | null | undefined> = [preferredId, urlId, this.selected];

    let next: string | null = null;
    for (const candidate of candidates) {
      if (exists(candidate)) {
        next = candidate!;
        break;
      }
    }

    if (!next && this.threads.length) {
      next = this.threads[0]._id;
    }

    if (next) {
      this.pushSelection(next, this.selected !== next);
    } else {
      this.pushSelection(null, this.selected !== null);
    }
  }

  onSelect(id: string) {
    this.pushSelection(id, true);
  }

  async onCreate() {
    if (this.threadsBusy) {
      return;
    }
    this.threadsError = '';
    this.threadsBusy = true;
    try {
      const response = await createThread('Nuevo chat');
      const newId = response?.row?._id ?? null;
      await this.syncThreads(newId);
    } catch (error) {
      this.threadsError = this.formatError(error, 'No se pudo crear el hilo.');
    } finally {
      this.threadsBusy = false;
    }
  }

  async onRename(id: string) {
    if (this.threadsBusy) {
      return;
    }

    const current = this.threads.find((t) => t._id === id);
    const nextTitle = prompt('Nuevo título', current?.title || '')?.trim();
    if (!nextTitle) {
      return;
    }

    this.threadsError = '';
    this.threadsBusy = true;
    try {
      await renameThread(id, nextTitle);
      await this.syncThreads(id);
    } catch (error) {
      this.threadsError = this.formatError(error, 'No se pudo renombrar el hilo.');
    } finally {
      this.threadsBusy = false;
    }
  }

  async onRemove(id: string) {
    if (this.threadsBusy) {
      return;
    }

    const thread = this.threads.find((t) => t._id === id);
    const title = thread?.title ? `"${thread.title}"` : 'este hilo';
    if (!confirm(`¿Eliminar ${title} y todos sus mensajes?`)) {
      return;
    }

    this.threadsError = '';
    this.threadsBusy = true;
    try {
      await deleteThread(id);
      await this.syncThreads(null);
    } catch (error) {
      this.threadsError = this.formatError(error, 'No se pudo eliminar el hilo.');
    } finally {
      this.threadsBusy = false;
    }
  }

  async onLogout() {
    try {
      await logout();
    } catch {
      // ignoramos errores de red puntuales al cerrar sesión
    }
    this.authed = false;
    this.threads = [];
    this.threadsBusy = false;
    this.threadsError = '';
    this.selected = null;
    this.email = '';
    this.password = '';
    this.err = '';
    this.pushSelection(null, true);
  }

  private pushSelection(id: string | null, force = false) {
    const previous = this.selected;
    this.selected = id;
    if (id) {
      history.replaceState({}, '', `?t=${id}`);
    } else {
      history.replaceState({}, '', location.pathname);
    }
    if (force || previous !== id) {
      window.dispatchEvent(new CustomEvent('thread-selected', { detail: id }));
    }
  }

  private formatError(error: unknown, fallback: string) {
    if (error instanceof Error && error.message) {
      return error.message;
    }
    if (typeof error === 'string' && error.trim()) {
      return error.trim();
    }
    return fallback;
  }

  private isPositive(payload: unknown) {
    if (!payload || typeof payload !== 'object') {
      return false;
    }

    const candidate = payload as Record<string, unknown>;
    if (typeof candidate.ok === 'boolean') {
      return candidate.ok;
    }
    if (typeof candidate.success === 'boolean') {
      return candidate.success;
    }
    if (typeof candidate.error === 'string' && candidate.error.trim()) {
      return false;
    }
    if (candidate.error instanceof Error) {
      return false;
    }

    return true;
  }
}
