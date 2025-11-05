import { Component, ElementRef, ViewChild, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { listMessages, postMessage, chatStream } from '../api';

type Msg = { role: 'user' | 'assistant' | 'system'; content: string };

@Component({
  standalone: true,
  selector: 'app-chat',
  imports: [CommonModule, FormsModule],
  template: `
  <div class="chat-wrap">
    <div class="chat-header">
      <h1>Conversación</h1>
      <div class="hint">Streaming SSE, abort, reconexión simple.</div>
    </div>

    <div #list class="chat-list">
      <div *ngIf="authRequired" class="state state--error">
        No estás autenticado.
        <button class="btn primary" (click)="goLogin()">Ir a login</button>
      </div>

      <div *ngIf="loading && !messages.length && !authRequired" class="state state--loading">Cargando mensajes…</div>
      <div *ngIf="err && !messages.length && !authRequired" class="state state--error">
        {{err}} <button class="btn" (click)="reload()" [disabled]="busy">Reintentar</button>
      </div>

      <ng-container *ngIf="!authRequired">
        <div *ngFor="let m of messages" class="msg" [class.me]="m.role==='user'">
          <div class="msg-role">{{ labelFor(m.role) }}</div>
          <div class="msg-bubble">{{ m.content }}</div>
        </div>

        <div *ngIf="assistantStreaming" class="msg">
          <div class="msg-role">Asistente</div>
          <div class="msg-bubble">
            <span *ngIf="assistantBuffer; else typing">{{ assistantBuffer }}</span>
            <ng-template #typing><span class="dots"></span></ng-template>
          </div>
        </div>
      </ng-container>
    </div>

    <form class="composer" (ngSubmit)="send()" novalidate>
      <textarea
        class="input"
        [(ngModel)]="draft"
        name="draft"
        rows="3"
        placeholder="Escribí tu mensaje…"
        [disabled]="busy || authRequired"
        (keydown)="onKeydown($event)"></textarea>

      <div class="actions">
        <button class="btn primary" type="submit" [disabled]="busy || !draft.trim() || authRequired">
          <span *ngIf="!busy">Enviar</span>
          <span *ngIf="busy" class="spinner"></span>
        </button>
        <button class="btn ghost" type="button" (click)="abort()" [disabled]="!assistantStreaming">Abortar</button>
        <button class="btn" type="button" (click)="reload()" [disabled]="busy">Refrescar</button>
      </div>
    </form>

    <div *ngIf="err && messages.length && !authRequired" class="footer-error">
      {{err}} <button class="btn" (click)="err=''">Cerrar</button>
    </div>
  </div>
  `
})
export class ChatPage implements OnDestroy {
  @ViewChild('list') listRef!: ElementRef<HTMLElement>;

  constructor(private router: Router) {}

  threadId = 'default';
  messages: Msg[] = [];
  loading = false;
  busy = false;
  err = '';
  authRequired = false;

  assistantStreaming = false;
  assistantBuffer = '';
  private abortCtrl: AbortController | null = null;

  async ngOnInit() { await this.reload(); }
  ngOnDestroy(): void { this.abort(); }

  async reload() {
    this.loading = true; this.err = ''; this.authRequired = false;
    try {
      const res = await (await import('../api')).listMessages(this.threadId);
      this.messages = (res?.rows || []) as Msg[];
      this.scrollToBottom(true);
    } catch (e) {
      const msg = this.formatError(e, 'No pude cargar los mensajes.');
      if (msg === 'NO_AUTH') {
        this.authRequired = true;
        // redirección automática a la SPA de login
        setTimeout(() => this.goLogin(), 150);
      } else {
        this.err = msg;
      }
    } finally {
      this.loading = false;
    }
  }

  draft = '';

  onKeydown(e: KeyboardEvent) {
    if (e.key !== 'Enter') return;
    if (e.shiftKey) return;
    e.preventDefault();
    if (!this.busy) this.send();
  }

  async send() {
    const text = (this.draft || '').trim();
    if (!text || this.busy || this.authRequired) return;

    this.busy = true; this.err = ''; this.assistantBuffer = '';
    const userMsg: Msg = { role: 'user', content: text };
    this.messages.push(userMsg);
    this.draft = '';
    this.scrollToBottom();

    try {
      await postMessage(this.threadId, 'user', text);

      this.abort();
      this.abortCtrl = new AbortController();

      this.assistantStreaming = true;
      await chatStream({
        threadId: this.threadId,
        message: text,
        onDelta: (chunk) => { this.assistantBuffer += chunk; this.scrollToBottom(); },
        signal: this.abortCtrl.signal
      });

      const final = this.assistantBuffer.trim();
      if (final) {
        await postMessage(this.threadId, 'assistant', final);
        this.messages.push({ role: 'assistant', content: final });
      }
    } catch (e) {
      const msg = this.formatError(e, 'El chat falló. Probá de nuevo.');
      if (msg === 'NO_AUTH') { this.authRequired = true; setTimeout(() => this.goLogin(), 150); }
      else this.err = msg;
    } finally {
      this.assistantStreaming = false;
      this.assistantBuffer = '';
      this.busy = false;
      this.abortCtrl = null;
      this.scrollToBottom();
    }
  }

  goLogin() { this.router.navigateByUrl('/login'); }

  abort() { if (this.abortCtrl) { try { this.abortCtrl.abort(); } catch {} } this.abortCtrl = null; }

  private scrollToBottom(force = false) {
    queueMicrotask(() => {
      const el = this.listRef?.nativeElement;
      if (!el) return;
      if (force || el.scrollHeight - el.scrollTop - el.clientHeight < 160) el.scrollTop = el.scrollHeight;
    });
  }

  labelFor(role: Msg['role']) { return role === 'user' ? 'Vos' : role === 'assistant' ? 'Asistente' : 'Sistema'; }

  private formatError(error: unknown, fallback: string) {
    if (error instanceof Error && error.message) return error.message;
    if (typeof error === 'string' && error.trim()) return error.trim();
    try { const s = JSON.stringify(error); if (s && s !== '{}') return s; } catch {}
    return fallback;
  }
}
