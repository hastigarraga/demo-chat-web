import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { listMessages, postMessage, chatStream } from '../api';

type Msg = { role: 'user' | 'assistant' | 'system'; content: string };

@Component({
  standalone: true,
  selector: 'app-chat',
  imports: [CommonModule, FormsModule],
  template: `
    <div class="chat">
      <header class="chat__header">
        <div>
          <h2 class="chat__title">Chat conversacional</h2>
          <p class="chat__subtitle text-dimmed">
            Conversá en tiempo real con respuestas en streaming.
          </p>
        </div>
        <span class="chat__status" *ngIf="sending">Generando respuesta…</span>
      </header>

      <section class="chat__messages" id="scroll">
        <p class="chat__placeholder" *ngIf="!threadId && !loadingMessages">
          Seleccioná o creá un hilo para comenzar.
        </p>

        <p class="chat__placeholder" *ngIf="loadingMessages">
          Cargando mensajes…
        </p>

        <ng-container *ngIf="threadId">
          <article
            class="message"
            *ngFor="let m of messages"
            [ngClass]="{
              'message--user': m.role === 'user',
              'message--assistant': m.role === 'assistant',
              'message--system': m.role === 'system'
            }"
          >
            <span class="message__role">{{ labelFor(m.role) }}</span>
            <div class="message__bubble">{{ m.content }}</div>
          </article>
        </ng-container>
      </section>

      <div class="chat__error" *ngIf="chatError">{{ chatError }}</div>

      <form class="chat__composer" (submit)="send($event)">
        <textarea
          class="input input--textarea"
          [(ngModel)]="input"
          name="msg"
          placeholder="Escribí tu mensaje. Shift + Enter para saltar de línea."
          (keydown.enter)="onEnter($event)"
          (keydown.shift.enter)="$event.stopPropagation()"
          [disabled]="!threadId || sending"
        ></textarea>
        <button
          type="submit"
          class="btn btn-primary"
          [disabled]="!threadId || sending || !input.trim()"
        >
          Enviar
        </button>
      </form>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        height: 100%;
      }

      .chat {
        height: 100%;
        display: flex;
        flex-direction: column;
        padding: 2rem;
        gap: 1.5rem;
      }

      .chat__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
      }

      .chat__title {
        margin: 0;
        font-size: 1.65rem;
      }

      .chat__subtitle {
        margin: 0.35rem 0 0 0;
      }

      .chat__status {
        padding: 0.25rem 0.85rem;
        border-radius: 999px;
        background: rgba(37, 99, 235, 0.15);
        border: 1px solid rgba(37, 99, 235, 0.35);
        font-size: 0.85rem;
        color: rgba(191, 219, 254, 0.85);
        font-weight: 600;
      }

      .chat__messages {
        flex: 1;
        min-height: 0;
        overflow-y: auto;
        padding: 1.5rem;
        border-radius: 1.5rem;
        border: 1px solid rgba(30, 41, 59, 0.75);
        background: linear-gradient(160deg, rgba(15, 23, 42, 0.82), rgba(8, 15, 29, 0.88));
        display: flex;
        flex-direction: column;
        gap: 1.15rem;
      }

      .chat__placeholder {
        margin: auto;
        text-align: center;
        color: rgba(148, 163, 184, 0.85);
        font-size: 0.95rem;
      }

      .message {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
        max-width: 82%;
      }

      .message--user {
        margin-left: auto;
        align-items: flex-end;
      }

      .message--assistant {
        align-items: flex-start;
      }

      .message__role {
        font-size: 0.75rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: rgba(148, 163, 184, 0.7);
      }

      .message__bubble {
        padding: 0.9rem 1.1rem;
        border-radius: 1.2rem;
        background: rgba(15, 23, 42, 0.9);
        border: 1px solid rgba(51, 65, 85, 0.55);
        white-space: pre-wrap;
        line-height: 1.5;
        box-shadow: 0 10px 24px rgba(2, 6, 23, 0.45);
      }

      .message--user .message__bubble {
        background: linear-gradient(135deg, rgba(14, 165, 233, 0.22), rgba(56, 189, 248, 0.35));
        border-color: rgba(14, 165, 233, 0.45);
      }

      .message--assistant .message__bubble {
        background: rgba(8, 11, 25, 0.88);
        border-color: rgba(37, 99, 235, 0.35);
      }

      .message--system .message__bubble {
        background: rgba(250, 204, 21, 0.12);
        border-color: rgba(250, 204, 21, 0.35);
      }

      .chat__error {
        border-radius: 1rem;
        border: 1px solid rgba(248, 113, 113, 0.45);
        background: rgba(248, 113, 113, 0.12);
        color: #fecaca;
        padding: 0.75rem 1rem;
        font-weight: 600;
      }

      .chat__composer {
        display: flex;
        gap: 1rem;
        align-items: flex-end;
      }

      .chat__composer .input {
        min-height: 120px;
      }

      @media (max-width: 720px) {
        .chat {
          padding: 1.25rem;
        }

        .chat__messages {
          padding: 1.1rem;
        }

        .chat__composer {
          flex-direction: column;
          align-items: stretch;
        }

        .chat__composer button {
          width: 100%;
        }
      }
    `,
  ],
})
export class ChatPage implements OnDestroy {
  input = '';
  messages: Msg[] = [];
  threadId: string | null = null;
  loadingMessages = false;
  sending = false;
  chatError = '';

  private streamAbort: AbortController | null = null;
  private onSelect = (ev: CustomEvent<string | null>) => this.loadThread(ev?.detail ?? null);

  async ngOnInit() {
    const params = new URLSearchParams(location.search);
    await this.loadThread(params.get('t'));
    window.addEventListener('thread-selected', this.onSelect as any);
  }

  ngOnDestroy() {
    window.removeEventListener('thread-selected', this.onSelect as any);
    this.cancelStream();
  }

  private async loadThread(id: string | null) {
    if (this.threadId === id && !this.loadingMessages) {
      return;
    }

    this.cancelStream();
    this.threadId = id;
    this.chatError = '';
    this.messages = [];

    if (!id) {
      return;
    }

    this.loadingMessages = true;
    try {
      const response = await listMessages(id);
      if (this.threadId !== id) {
        return;
      }
      const rows = Array.isArray(response?.rows) ? response.rows : [];
      this.messages = rows.map((m: any) => ({ role: m.role, content: m.content })) as Msg[];
      this.scroll();
    } catch (error) {
      if (this.threadId === id) {
        this.chatError = this.formatError(error, 'No se pudieron cargar los mensajes.');
      }
    } finally {
      if (this.threadId === id) {
        this.loadingMessages = false;
      }
    }
  }

  onEnter(ev: KeyboardEvent) {
    if (!ev.shiftKey) {
      ev.preventDefault();
      void this.send();
    }
  }

  private scroll() {
    setTimeout(() => {
      document.getElementById('scroll')?.scrollTo({ top: 9e9, behavior: 'smooth' });
    }, 0);
  }

  async send(ev?: Event) {
    ev?.preventDefault();
    if (!this.threadId || this.sending || this.loadingMessages) {
      return;
    }

    const text = this.input.trim();
    if (!text) {
      return;
    }

    this.chatError = '';
    this.sending = true;
    this.input = '';

    const userMessage: Msg = { role: 'user', content: text };
    this.messages.push(userMessage);
    this.scroll();

    let assistant: Msg | null = null;

    try {
      await postMessage(this.threadId, 'user', text);

      assistant = { role: 'assistant', content: '' };
      this.messages.push(assistant);
      this.scroll();

      this.streamAbort = new AbortController();
      await chatStream(
        this.threadId,
        this.messages,
        (delta) => {
          if (!assistant) {
            return;
          }
          assistant.content += delta;
          this.scroll();
        },
        { signal: this.streamAbort.signal }
      );
    } catch (error) {
      if ((error as DOMException)?.name === 'AbortError') {
        return;
      }

      this.chatError = this.formatError(error, 'No se pudo enviar el mensaje.');
      if (assistant && !assistant.content) {
        const index = this.messages.indexOf(assistant);
        if (index !== -1) {
          this.messages.splice(index, 1);
        }
      } else if (!assistant) {
        const index = this.messages.indexOf(userMessage);
        if (index !== -1) {
          this.messages.splice(index, 1);
        }
      }
      this.input = text;
    } finally {
      this.sending = false;
      this.cancelStream();
    }
  }

  private cancelStream() {
    if (this.streamAbort) {
      this.streamAbort.abort();
      this.streamAbort = null;
    }
  }

  private labelFor(role: Msg['role']) {
    switch (role) {
      case 'user':
        return 'Vos';
      case 'assistant':
        return 'Asistente';
      default:
        return 'Sistema';
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
}
