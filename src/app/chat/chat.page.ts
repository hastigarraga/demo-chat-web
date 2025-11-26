import { Component, OnInit, ViewChild, ElementRef, HostListener } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ChatService } from "./chat.service";
import { Router } from '@angular/router';
import { AuthService } from "../auth/auth.service";

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
  @ViewChild("messagesEl") messagesEl!: ElementRef<HTMLDivElement>;

  userName = "";
  userEmail = "";

  private _autoRenamed = new Set<string>();

  // menú contextual (fixed)
  menuOpenId: string | null = null;
  menuTop = 0;
  menuLeft = 0;
  menuThreadRef: any = null;

  // sidebar
  sidebarCollapsed = false;

  // account menu
  accountMenuOpen = false;

  constructor(
    private api: ChatService,
    private router: Router,
    private auth: AuthService
  ) {}

  ngOnInit() {
    this.restoreSidebar();
    this.loadMe();
    this.loadThreads();
  }

  trackByIdx = (i:number) => i;

  get userInitial(): string {
    const s = (this.userName || this.userEmail || "U").trim();
    return (s[0] || "U").toUpperCase();
  }

  restoreSidebar(){
    try {
      this.sidebarCollapsed = localStorage.getItem("sidebarCollapsed") === "1";
    } catch {}
  }

  toggleSidebar(){
    this.sidebarCollapsed = !this.sidebarCollapsed;
    try {
      localStorage.setItem("sidebarCollapsed", this.sidebarCollapsed ? "1" : "0");
    } catch {}
  }

  loadMe(){
    this.auth.me().subscribe({
      next: (res:any) => {
        const u = res?.user || {};
        this.userName = String(u.name || "").trim();
        this.userEmail = String(u.email || "").trim();
      },
      error: () => {}
    });
  }

  loadThreads(){
    this.api.listThreads().subscribe({
      next: (res:any) => {
        this.threads = res?.rows || [];
        if (!this.current && this.threads.length) {
          this.openThread(this.threads[0], true);
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
      },
      error: () => {}
    });
  }

  openThread(t:any, clear:boolean=true){
    this.current = t;
    if (clear) this.messages = [];
    // cargar mensajes del thread si tu api lo hace así, o quedan en vacío hasta enviar
    this.scrollBottom();
  }

  send(){
    const text = this.input.trim();
    if (!text || this.sending) return;

    this.sending = true;

    const threadId = this.current?._id || this.current?.id || null;

    this.api.sendMessage(threadId, text).subscribe({
      next: (res:any) => {
        const t = res?.thread;
        const msgs = res?.messages || [];

        if (t) {
          const id = t?._id || t?.id;
          // upsert en sidebar
          const idx = this.threads.findIndex(x => (x?._id||x?.id) === id);
          if (idx === -1) this.threads = [t, ...this.threads];
          else this.threads[idx] = { ...this.threads[idx], ...t };
          this.current = t;
        }

        this.messages = msgs;
        this.input = "";
        this.sending = false;
        this.scrollBottom();

        this.autoRenameIfNeededLLM(this.current, text);
      },
      error: () => {
        this.sending = false;
      }
    });
  }

  // ===== Thread actions =====
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
      },
      error: () => {}
    });
  }

  renameThread(t:any){
    const id = t?._id || t?.id;
    if (!id) return;
    const currentTitle = String(t?.title || "Nuevo chat").trim() || "Nuevo chat";
    const next = prompt("Nuevo título:", currentTitle);
    const title = String(next || "").trim();
    if (!title) return;

    this.api.renameThread(id, title).subscribe({
      next: () => {
        t.title = title;
        this.closeMenus();
      },
      error: () => {}
    });
  }

  private autoRenameIfNeededLLM(thread: any, seed: string) {
    const id = thread?._id || thread?.id;
    if (!id) return;

    if (this._autoRenamed.has(id)) return;
    const raw = String(thread?.title || "").trim();
    const isPlaceholder = !raw || /^nuevo chat$/i.test(raw);
    if (!isPlaceholder) return;

    this._autoRenamed.add(id);

    this.api.generateSmartTitle(seed).subscribe({
      next: (generated: string) => {
        const title = String(generated ?? "").trim();
        if (!title || /^nuevo chat$/i.test(title)) {
          this._autoRenamed.delete(id);
          return;
        }
        this.api.renameThread(id, title).subscribe({
          next: () => {
            const t = this.threads.find(x => (x?._id||x?.id) === id);
            if (t) t.title = title;
          },
          error: () => {}
        });
      },
      error: () => {
        this._autoRenamed.delete(id);
      }
    });
  }

  // ===== Menú contextual =====
  openMenu(ev: MouseEvent, t: any){
    ev.preventDefault();
    ev.stopPropagation();

    this.menuOpenId = t?._id || t?.id;
    this.menuThreadRef = t;

    const rect = (ev.target as HTMLElement).getBoundingClientRect();
    this.menuTop = rect.bottom + 6;
    this.menuLeft = Math.min(rect.left, window.innerWidth - 240);
  }

  closeMenus(){
    this.menuOpenId = null;
    this.menuThreadRef = null;
  }

  toggleAccountMenu(){
    this.accountMenuOpen = !this.accountMenuOpen;
  }

  @HostListener("document:click", ["$event"])
  onDocClick(_ev: MouseEvent){
    if (this.menuOpenId) this.closeMenus();
    if (this.accountMenuOpen) this.accountMenuOpen = false;
  }

  @HostListener("window:keydown.escape")
  onEsc(){
    this.closeMenus();
    this.accountMenuOpen = false;
  }

  @HostListener("window:scroll")
  onScroll(){
    if (this.menuOpenId) this.closeMenus();
  }

  @HostListener("window:resize")
  onResize(){
    if (this.menuOpenId) this.closeMenus();
  }

  // ===== OAuth connect =====
  connectWorkspace(){
    // versión original: lleva a start de OAuth y requiere email en query si está disponible
    const base = (this.api as any).apiBase || "";
    const url = `${base}/workspace/auth/start?service=drive` + (this.userEmail ? `&user_google_email=${encodeURIComponent(this.userEmail)}` : "");
    window.open(url, "_blank");
    this.accountMenuOpen = false;
  }

  logout(){
    try { localStorage.removeItem("token"); } catch {}
    this.router.navigateByUrl("/auth");
  }

  scrollBottom(){
    setTimeout(() => {
      try { this.bottom?.nativeElement?.scrollIntoView({ behavior:"smooth", block:"end" }); } catch {}
    }, 20);
  }
}
