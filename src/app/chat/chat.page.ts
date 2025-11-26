import { Component, OnInit, ViewChild, ElementRef, HostListener } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ChatService } from "./chat.service";
import { Router } from '@angular/router';
import { AuthService } from "../auth/auth.service";
import { environment } from "../../environments/environment";   // <= IMPORTANTE

// Pipes locales
import { LocalTzDatePipe } from "../shared/pipes/local-tz-date.pipe";
import { ThreadTitlePipe } from "../shared/pipes/thread-title.pipe";

@Component({
  standalone: true,
  selector: "app-chat",
  templateUrl: "./chat.page.html",
  styleUrls: ["./chat.page.scss"],
  imports: [CommonModule, FormsModule, LocalTzDatePipe, ThreadTitlePipe]
})
export class ChatPage implements OnInit {
  threads:any[]=[]; current:any=null; messages:any[]=[];
  input=""; sending=false;
  @ViewChild("bottom") bottom!: ElementRef<HTMLDivElement>;

  private _autoRenamed = new Set<string>();

  // menú contextual (fixed)
  menuOpenId: string | null = null;
  menuTop = 0;
  menuLeft = 0;
  menuThreadRef: any = null;

  // UI sidebar y cuenta
  sidebarCollapsed = localStorage.getItem('ui.sidebarCollapsed') === '1';
  accountMenuOpen = false;
  userName = '';
  userEmail = '';

  // Autocolapso por breakpoint
  private readonly autoCollapseBp = 700; // px
  private userToggled = false;

  constructor(private api: ChatService, private auth: AuthService,  private router: Router) {}

  ngOnInit(){
    this.applyAutoCollapse();
    this.bootstrap();
    this.loadUser();
  }

  private loadUser(){
    this.auth.me().subscribe({
      next: (res) => {
        const u = res?.user || {};
        this.userName  = (u.name  || '').trim();
        this.userEmail = (u.email || '').trim();
      },
      error: () => { /* ignora, deja vacío */ }
    });
  }

  // cerrar menú con click afuera / ESC / resize; también cierra menú de cuenta
  @HostListener('document:click') onDocClick() { this.closeMenus(); this.accountMenuOpen = false; }
  @HostListener('document:keydown.escape') onEsc() { this.closeMenus(); this.accountMenuOpen = false; }
  @HostListener('window:resize') onResize() {
    if (this.menuOpenId) this.closeMenus();
    this.applyAutoCollapse();
  }

  private applyAutoCollapse(){
    const small = window.innerWidth <= this.autoCollapseBp;
    if (!this.userToggled) this.sidebarCollapsed = small;
    if (!small) this.userToggled = false;
  }

  closeMenus(){ this.menuOpenId = null; this.menuThreadRef = null; }

  openMenu(ev: MouseEvent, t: any){
    ev.stopPropagation();
    const btn = ev.currentTarget as HTMLElement;
    const r = btn.getBoundingClientRect();
    // posición FIXED a la derecha del botón (8px)
    this.menuTop  = r.top + window.scrollY - 4;
    this.menuLeft = r.right + window.scrollX + 8;
    const id = t._id || t.id;
    this.menuOpenId = this.menuOpenId === id ? null : id;
    this.menuThreadRef = t;
  }

  toggleSidebar(){
    this.userToggled = true;
    this.sidebarCollapsed = !this.sidebarCollapsed;
    try { localStorage.setItem('ui.sidebarCollapsed', this.sidebarCollapsed ? '1' : '0'); } catch {}
  }

  toggleAccountMenu(ev: MouseEvent){
    ev.stopPropagation();
    this.accountMenuOpen = !this.accountMenuOpen;
  }

  get userInitial(): string {
    const s = (this.userName || this.userEmail || 'U').trim();
    return s ? s[0].toUpperCase() : 'U';
  }

  bootstrap(){
    this.api.listThreads().subscribe({
      next: res => {
        this.threads = res.rows || [];
        this.ensureActive();
      },
      error: err => console.error("[ChatPage] listThreads error", err)
    });
  }

  ensureActive(){
    if (this.current) { this.loadMessages(this.current._id || this.current.id); return; }
    this.api.lastActive().subscribe({
      next: res => {
        this.current = res.row;
        if (this.current) this.loadMessages(this.current._id || this.current.id);
      },
      error: err => console.error("[ChatPage] lastActive error", err)
    });
  }

  loadMessages(id:string){
    this.api.getThread(id).subscribe({
      next: res => {
        this.current = res.row;
        this.messages = res.messages || [];
        setTimeout(()=>this.bottom?.nativeElement?.scrollIntoView({behavior:"smooth"}), 30);
      },
      error: err => console.error("[ChatPage] getThread error", err)
    });
  }

  select(t:any){
    if (!t) return;
    const id = t._id || t.id;
    if (id === (this.current?._id || this.current?.id)) return;
    this.current = t;
    this.loadMessages(id);
  }

  newThread(){
    this.api.createThread().subscribe({
      next: res => {
        const row = res.row;
        if (!row) return;
        this.threads = [row, ...this.threads];
        this.select(row);
      },
      error: err => console.error("[ChatPage] newThread error", err)
    });
  }

  renameThread(t:any){
    const curr = t?.title || "Nuevo chat";
    const title = prompt("Nuevo título", curr)?.trim();
    if (!title) return;
    const id = t._id || t.id;
    this.api.renameThread(id, title).subscribe({
      next: _ => {
        const idx = this.threads.findIndex(x => (x._id || x.id) === id);
        if (idx >= 0) this.threads = this.threads.map((x,i)=> i===idx? { ...x, title } : x);
        if (this.current && (this.current._id === id || this.current.id === id)) {
          this.current = { ...this.current, title };
        }
      },
      error: err => console.error("[ChatPage] rename error", err)
    });
  }

  removeThread(t:any){
    const id = t._id || t.id;
    if (!confirm("¿Eliminar este chat?")) return;
    this.api.deleteThread(id).subscribe({
      next: _ => {
        this.threads = this.threads.filter(x => (x._id||x.id) !== id);
        if (this.current && (this.current._id === id || this.current.id === id)) {
          this.current = null; this.messages = [];
          this.ensureActive();
        }
      },
      error: err => console.error("[ChatPage] delete error", err)
    });
  }

  send(){
    const text = this.input.trim();
    if (!text || this.sending) return;
    this.sending = true;
    const id = this.current?._id || this.current?.id || null;

    // UI optimista
    const prev = this.messages.slice();
    this.messages = [...prev, { role: "user", content: text }, { role: "assistant", content: "…" }];
    setTimeout(()=>this.bottom?.nativeElement?.scrollIntoView({behavior:"smooth"}), 10);

    this.api.sendMessage(id, text).subscribe({
      next: res => {
        const newThread = res.thread || this.current;
        if (newThread) {
          this.current = newThread;
          const tid = this.current._id || this.current.id;
          const idx = this.threads.findIndex(x => (x._id||x.id) === tid);
          if (idx >= 0) this.threads = this.threads.map((x,i)=> i===idx? { ...x, ...newThread } : x);
          else this.threads = [newThread, ...this.threads];
        }
        this.messages = res.messages || this.messages;
        this.input = ""; this.sending = false;
        setTimeout(()=>this.bottom?.nativeElement?.scrollIntoView({behavior:"smooth"}), 10);

        const firstAssistant = (this.messages || []).find(m => m?.role === "assistant" && (m.content||"").trim());
        const seedAnswer = String(firstAssistant?.content || "").trim();
        const seedUser   = String(text || "").trim();
        const seed = (seedAnswer ? `Pregunta: ${seedUser}\nRespuesta: ${seedAnswer}` : seedUser).slice(0, 2000);
        this.autoRenameIfNeededLLM(this.current, seed);
      },
      error: err => {
        console.error("[ChatPage] send error", err);
        this.messages = prev;
        this.sending=false;
      }
    });
  }

  logout() {
    try { localStorage.removeItem('token'); } catch {}
    this.router.navigateByUrl('/auth');
  }

  // botón "Connect Google"
  connectWorkspace(service: string = "drive") {
    const base  = environment.API_BASE.replace(/\/+$/, "");
    const email = (this.userEmail || "").trim();

    const params = new URLSearchParams({ service });
    if (email) params.append("user_google_email", email);

    const url = `${base}/workspace/auth/start?${params.toString()}`;

    window.open(
      url,
      "_blank",
      "width=520,height=720,noopener,noreferrer"
    );
  }

  titleOf(t: any): string {
    const ready = (t?.title || "").trim();
    const isPlaceholder = /^nuevo chat$/i.test(ready);
    if (ready && !isPlaceholder) return ready;
    return "Nuevo chat";
  }

  private autoRenameIfNeededLLM(thread: any, seed: string) {
    const id = thread?._id || thread?.id;
    if (!id) return;

    if (this._autoRenamed.has(id)) return;
    const raw = (thread?.title || "").trim();
    const isPlaceholder = /^nuevo chat$/i.test(raw);
    if (raw && !isPlaceholder) return;

    this._autoRenamed.add(id);
    this.api.generateSmartTitle(seed).subscribe({
      next: (generated: string) => {
        const title = String(generated ?? "").trim();
        if (!title || /^nuevo chat$/i.test(title)) {
          this._autoRenamed.delete(id);
          return;
        }
        this.persistTitle(id, title);
      },
      error: (err) => {
        console.error("[ChatPage] LLM title error", err);
        this._autoRenamed.delete(id);
      }
    });
  }

  private persistTitle(id: string, title: string) {
    this.api.renameThread(id, title).subscribe({
      next: _ => {
        if (this.current && (this.current._id === id || this.current.id === id)) {
          this.current = { ...this.current, title };
        }
        const idx = this.threads.findIndex(x => (x._id || x.id) === id);
        if (idx >= 0) this.threads = this.threads.map((x, i) => i === idx ? { ...x, title } : x);
      },
      error: err => {
        console.error("[ChatPage] persist title error", err);
        this._autoRenamed.delete(id);
      }
    });
  }

  trackByIdx(_:number, m:any){ return m?._id || m?.id || `${m.role}:${(m.content||"").slice(0,12)}`; }
}
