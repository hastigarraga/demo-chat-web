import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { listMessages, postMessage, chatStream } from '../api';

type Msg = { role:'user'|'assistant'|'system'; content:string };

@Component({
  standalone: true,
  selector: 'app-chat',
  imports: [CommonModule, FormsModule],
  template: `
  <div style="max-width:900px;margin:0 auto;padding:16px;color:#fff;height:100vh;display:flex;flex-direction:column">
    <h1 style="font-size:22px;margin-bottom:8px;">Chat</h1>

    <div id="scroll" style="flex:1;overflow:auto;border:1px solid #1f2937;border-radius:8px;padding:12px;background:#0b1220">
      <div *ngIf="!threadId" style="opacity:.8">Seleccioná o creá un hilo en la izquierda.</div>
      <div *ngFor="let m of messages" style="margin-bottom:10px" [hidden]="!threadId">
        <div [style.color]="m.role==='user' ? '#93c5fd' : '#e5e7eb'"><b>{{m.role}}</b></div>
        <div>{{m.content}}</div>
      </div>
    </div>

    <form (submit)="send($event)" style="display:flex;gap:8px;margin-top:12px">
      <textarea [(ngModel)]="input" name="msg" placeholder="Escribe..."
        (keydown.enter)="onEnter($event)" (keydown.shift.enter)="$event.stopPropagation()"
        [disabled]="!threadId"
        style="flex:1;padding:12px;background:#1e293b;border:1px solid #334155;border-radius:8px;color:#fff;min-height:52px"></textarea>
      <button type="submit" [disabled]="!threadId"
        style="background:#0EA5E9;border:none;border-radius:8px;padding:12px 14px;">Enviar</button>
    </form>
  </div>
  `
})
export class ChatPage implements OnDestroy {
  input = '';
  messages: Msg[] = [];
  threadId: string | null = null;

  private onSelect = (ev: any) => this.loadThread(ev?.detail ?? null);

  async ngOnInit() {
    const u = new URLSearchParams(location.search);
    await this.loadThread(u.get("t"));
    window.addEventListener('thread-selected', this.onSelect as any);
  }

  ngOnDestroy() {
    window.removeEventListener('thread-selected', this.onSelect as any);
  }

  private async loadThread(id: string | null) {
    this.threadId = id;
    this.messages = [];
    if (!id) return;
    const r = await listMessages(id).catch(() => ({ rows: [] }));
    this.messages = (r.rows || []).map((m: any) => ({ role: m.role, content: m.content }));
    this.scroll();
  }

  onEnter(ev: KeyboardEvent) {
    if (!ev.shiftKey) { ev.preventDefault(); this.send(); }
  }

  private scroll() {
    setTimeout(() => { document.getElementById('scroll')?.scrollTo({ top: 9e9 }); }, 0);
  }

  async send(ev?: Event) {
    ev?.preventDefault();
    if (!this.threadId) return;
    const text = this.input.trim();
    if (!text) return;

    this.messages.push({ role: 'user', content: text }); this.scroll();
    this.input = '';

    await postMessage(this.threadId, 'user', text);
    let acc = '';
    this.messages.push({ role: 'assistant', content: '' });
    await chatStream(this.threadId, this.messages, (delta) => {
      acc += delta;
      this.messages[this.messages.length - 1].content = acc;
      this.scroll();
    });
  }
}
