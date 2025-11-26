import { Component, OnInit, ViewChild, ElementRef, HostListener } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ChatService } from "./chat.service";
import { Router } from '@angular/router';
import { AuthService } from "../auth/auth.service";
import { environment } from "../../environments/environment";

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

  userName = "";
  userEmail = "";

  sidebarCollapsed = false;

  private _autoRenamed = new Set<string>();

  // menú contextual (fixed)
  menuOpenId: string | null = null;
  menuTop = 0;
  menuLeft = 0;
  menuThreadRef: any = null;

  // account menu
  accountMenuOpen = false;

  // Google Workspace connection state
  gwsConnected = false;
  gwsEmail = '';
  gwsLoading = false;

  constructor(
    private api: ChatService,
    private router: Router,
    private auth: AuthService
  ) {}

  ngOnInit(){
    this.applyAutoCollapse();
    this.bootstrap();
    this.loadUser();
    this.loadWorkspaceStatus();
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

  toggleSidebar(){
    this.sidebarCollapsed = !this.sidebarCollapsed;
    try {
      localStorage.setItem("sidebarCollapsed", this.sidebarCollapsed ? "1":"0");
    } catch {}
  }

  private applyAutoCollapse(){
    try {
      const v = localStorage.getItem("sidebarCollapsed");
      this.sidebarCollapsed = v === "1";
    } catch {}
  }

  // click afuera / ESC
  @HostListener("document:click", ["$event"])
  onDocClick(ev: MouseEvent) {
    if (this.menuOpenId) this.closeMenus();
    if (this.accountMenuOpen) this.accountMenuOpen = false;
  }

  @HostListener("window:keydown.escape")
  onEsc() { this.closeMenus(); this.accountMenuOpen = false; }

  @HostListener("window:scroll")
  onScroll() { if (this.menuOpenId) this.closeMenus(); }

  @HostListener("window:resize")
  onResize() { if (this.menuOpenId) this.closeMenus(); }

  // ===== Context menu threads =====
  openMenu(ev: MouseEvent, t: any) {
    ev.preventDefault();
    ev.stopPropagation();

    this.menuOpenId = t?._id || t?.id;
    this.menuThreadRef = t;
    const rect = (ev.target as HTMLElement).getBoundingClientRect();

    // fixed menu
    this.menuTop = rect.bottom + 6;
    this.menuLeft = Math.min(rect.left, window.innerWidth - 220);
  }

  closeMenus() {
    this.menuOpenId = null;
    this.menuThreadRef = null;
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
        if (!this.current && this.threads.length) {
          this.openThread(this.threads[0], false);
        }
      },
      error: () => {}
    });
  }

  newThread(){
    this.api.createThread().subscribe({
      next: (res:any) => {
        const t = res?.thread;
        if (!t) return;
        this.threads = [t, ...this.threads];
        this.openThread(t, true);
      }
    });
  }

  openThread(t:any, clear:boolean=true){
    this.current = t;
    if (clear) this.messages = [];
    this.scrollBottom();
  }

  deleteThread(t:any){
    const id = t?._id || t?.id;
    if (!id) return;
    this.api.deleteThread(id).subscribe({
      next: () => {
        this.threads = this.threads.filter(x => (x?._id||x?.id) !== id);
        if ((this.current?._id||this.current?.id) === id) {
          this.current = null;
          this.messages = [];
          if (this.threads.length) this.openThread(this.threads[0], true);
        }
        this.closeMenus();
      }
    });
  }

  renameThreadPrompt(t:any){
    const id = t?._id || t?.id;
    if (!id) return;
    const currentTitle = (t?.title || "").trim() || "Nuevo chat";
    const next = prompt("Nuevo título:", currentTitle);
    const title = (next || "").trim();
    if (!title) return;

    this.api.renameThread(id, title).subscribe({
      next: () => {
        t.title = title;
        this.closeMenus();
      }
    });
  }

  send(){
    const text = this.input.trim();
    if (!text || this.sending) return;

    this.sending = true;
    const prev = [...this.messages, { role:"user", content:text }];

    const threadId = this.current?._id || this.current?.id || null;

    this.api.sendMessage(threadId, text).subscribe({
      next: (res:any) => {
        const t = res?.thread;
        const msgs = res?.messages || [];

        if (t) {
          const id = t?._id || t?.id;
          const exists = this.threads.some(x => (x?._id||x?.id) === id);
          if (!exists) this.threads = [t, ...this.threads];
          this.current = t;
        }

        this.messages = msgs.length ? msgs : prev;
        this.input = "";
        this.sending = false;
        this.scrollBottom();

        // Auto-rename si es placeholder
        this.autoRenameIfNeededLLM(this.current, text);
      },
      error: () => {
        this.messages = prev;
        this.sending=false;
      }
    });
  }

  scrollBottom(){
    setTimeout(() => {
      try { this.bottom?.nativeElement?.scrollIntoView({ behavior:"smooth", block:"end" }); } catch {}
    }, 20);
  }

  logout() {
    try { localStorage.removeItem('token'); } catch {}
    this.router.navigateByUrl('/auth');
  }

  // ===== Google Workspace OAuth =====
  loadWorkspaceStatus() {
    this.api.workspaceStatus().subscribe({
      next: (r) => {
        this.gwsConnected = !!r?.connected;
        this.gwsEmail = String(r?.email || '').trim();
      },
      error: () => {
        this.gwsConnected = false;
        this.gwsEmail = '';
      }
    });
  }

  connectWorkspace(service: string = "drive") {
    this.gwsLoading = true;
    this.accountMenuOpen = false;

    this.api.workspaceAuthStart(service, window.location.origin).subscribe({
      next: (r) => {
        const url = String(r?.auth_url || '').trim();
        if (!url) { this.gwsLoading = false; return; }
        // Redirige a Google (después vuelve a /oauth2callback y ahí a /chat)
        window.location.href = url;
      },
      error: () => { this.gwsLoading = false; }
    });
  }

  disconnectWorkspace() {
    this.api.workspaceDisconnect().subscribe({
      next: () => this.loadWorkspaceStatus(),
      error: () => this.loadWorkspaceStatus(),
    });
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
      next: () => {
        const t = this.threads.find(x => (x?._id||x?.id) === id);
        if (t) t.title = title;
      },
      error: () => {}
    });
  }
}
