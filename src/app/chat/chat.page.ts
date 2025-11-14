import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  HostListener,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";

import { ChatService } from "./chat.service";
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
  imports: [CommonModule, FormsModule, LocalTzDatePipe, ThreadTitlePipe],
})
export class ChatPage implements OnInit {
  threads: any[] = [];
  current: any = null;
  messages: any[] = [];

  input = "";
  sending = false;

  @ViewChild("bottom") bottom!: ElementRef<HTMLDivElement>;

  private _autoRenamed = new Set<string>();

  // menú contextual (fixed)
  menuOpenId: string | null = null;
  menuTop = 0;
  menuLeft = 0;
  menuThreadRef: any = null;

  // sidebar y cuenta
  sidebarCollapsed = false;
  accountMenuOpen = false;

  userName = "";
  userEmail = "";

  constructor(
    private api: ChatService,
    private auth: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadUser();
    this.loadThreads();
  }

  // ================== USER ==================

  private loadUser() {
    this.auth.me().subscribe({
      next: (res: any) => {
        const u = res?.user || {};
        this.userName = (u.name || "").trim();
        this.userEmail = (u.email || "").trim();
      },
      error: () => {
        // si falla, seguimos sin nombre/email
      },
    });
  }

  get userInitial(): string {
    const base = (this.userName || this.userEmail || "U").trim();
    return base ? base.charAt(0).toUpperCase() : "U";
  }

  // ================== THREADS ==================

  private loadThreads() {
    this.api.listThreads().subscribe({
      next: (res: { ok: boolean; rows: any[] }) => {
        this.threads = res?.rows || [];
        if (this.threads.length && !this.current) {
          this.select(this.threads[0]);
        }
      },
      error: (err: any) =>
        console.error("[ChatPage] listThreads error", err),
    });
  }

  select(t: any) {
    if (!t) return;
    const id = t._id || t.id;
    if (!id) return;

    this.current = t;
    this.loadMessages(id);
  }

  newThread() {
    this.api.createThread().subscribe({
      next: (res: { ok: boolean; row: any }) => {
        const row = res?.row;
        if (!row) return;
        this.threads = [row, ...this.threads];
        this.select(row);
      },
      error: (err: any) =>
        console.error("[ChatPage] createThread error", err),
    });
  }

  // usamos tu getThread en vez de un getMessages inexistente
  loadMessages(threadId: string) {
    this.api.getThread(threadId).subscribe({
      next: (res: { ok: boolean; row: any; messages: any[] }) => {
        // por si el backend devuelve el thread actualizado
        this.current = res?.row || this.current;
        this.messages =
          res?.messages || res?.row?.messages || [];
        this.scrollBottom();
      },
      error: (err: any) =>
        console.error("[ChatPage] getThread error", err),
    });
  }

  // ================== MENSAJES ==================

  send() {
    const text = this.input.trim();
    if (!text || this.sending || !this.current) return;

    const id = this.current._id || this.current.id;
    if (!id) return;

    this.sending = true;

    this.api.sendMessage(id, text).subscribe({
      next: (res: { ok: boolean; thread: any; messages: any[] }) => {
        this.current = res?.thread || this.current;
        this.messages = res?.messages || this.messages;
        this.input = "";
        this.sending = false;
        this.scrollBottom();
        this.smartRenameIfNeeded();
      },
      error: (err: any) => {
        console.error("[ChatPage] sendMessage error", err);
        this.sending = false;
      },
    });
  }

  private scrollBottom() {
    setTimeout(() => {
      try {
        this.bottom?.nativeElement.scrollIntoView({
          behavior: "smooth",
          block: "end",
        });
      } catch {
        // ignore
      }
    }, 0);
  }

  // ================== AUTO-RENAME ==================
  // Usa tu generateSmartTitle + renameThread (no se toca el servicio)

  private smartRenameIfNeeded() {
    const cur = this.current;
    if (!cur) return;

    const id = cur._id || cur.id;
    if (!id || this._autoRenamed.has(id)) return;

    const rawTitle = (cur.title || "").trim();
    const isPlaceholder =
      !rawTitle ||
      /^nuevo chat$/i.test(rawTitle) ||
      /^new chat$/i.test(rawTitle);

    if (!isPlaceholder) return;

    const userMessages = (this.messages || [])
      .filter((m) => m.role === "user")
      .map((m) => m.content || "")
      .join(" ")
      .slice(0, 200);

    if (!userMessages) return;

    this._autoRenamed.add(id);

    // 1) pedimos título al utils
    this.api.generateSmartTitle(userMessages).subscribe({
      next: (title: string) => {
        const finalTitle = (title || "").trim();
        if (!finalTitle) {
          this._autoRenamed.delete(id);
          return;
        }

        // 2) renombramos el thread en el backend
        this.api.renameThread(id, finalTitle).subscribe({
          next: () => {
            this.current = { ...this.current, title: finalTitle };
            this.threads = this.threads.map((t) =>
              (t._id || t.id) === id ? { ...t, title: finalTitle } : t
            );
          },
          error: (err: any) => {
            console.error(
              "[ChatPage] renameThread (auto) error",
              err
            );
            this._autoRenamed.delete(id);
          },
        });
      },
      error: (err: any) => {
        console.error("[ChatPage] generateSmartTitle error", err);
        this._autoRenamed.delete(id);
      },
    });
  }

  // ================== CONTEXT MENU THREADS ==================

  openMenu(ev: MouseEvent, t: any) {
    ev.stopPropagation();
    const id = t?._id || t?.id;
    if (!id) return;

    const btn = ev.currentTarget as HTMLElement;
    const rect = btn.getBoundingClientRect();

    this.menuTop = rect.top + window.scrollY + rect.height;
    this.menuLeft = rect.right + window.scrollX;

    this.menuOpenId = id;
    this.menuThreadRef = t;
  }

  closeMenus() {
    this.menuOpenId = null;
    this.menuThreadRef = null;
  }

  renameThread(t: any) {
    if (!t) return;
    const id = t._id || t.id;
    if (!id) return;

    const currentTitle = (t.title || "New chat").trim();
    const next = window.prompt("Edit title", currentTitle);
    if (!next) return;

    const title = next.trim();
    if (!title || title === currentTitle) return;

    this.api.renameThread(id, title).subscribe({
      next: () => {
        this.threads = this.threads.map((th) =>
          (th._id || th.id) === id ? { ...th, title } : th
        );
        if (
          this.current &&
          (this.current._id || this.current.id) === id
        ) {
          this.current = { ...this.current, title };
        }
      },
      error: (err: any) =>
        console.error("[ChatPage] renameThread error", err),
    });
  }

  removeThread(t: any) {
    if (!t) return;
    const id = t._id || t.id;
    if (!id) return;

    if (!window.confirm("Delete this chat?")) return;

    // usamos tu deleteThread, no un removeThread inexistente
    this.api.deleteThread(id).subscribe({
      next: () => {
        this.threads = this.threads.filter(
          (th) => (th._id || th.id) !== id
        );
        if (
          this.current &&
          (this.current._id || this.current.id) === id
        ) {
          this.current = null;
          this.messages = [];
        }
      },
      error: (err: any) =>
        console.error("[ChatPage] deleteThread error", err),
    });
  }

  // ================== SIDEBAR / ACCOUNT MENU ==================

  toggleSidebar() {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  toggleAccountMenu(ev: MouseEvent) {
    ev.stopPropagation();
    this.accountMenuOpen = !this.accountMenuOpen;
  }

  connectWorkspace(service: string = "drive") {
    const base = environment.API_BASE.replace(/\/+$/, "");
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

  logout() {
    try {
      localStorage.removeItem("token");
      localStorage.removeItem("csrf");
    } catch {}
    this.router.navigateByUrl("/auth");
  }

  // ================== HOST LISTENERS ==================

  @HostListener("document:click")
  onDocClick() {
    this.closeMenus();
    this.accountMenuOpen = false;
  }

  @HostListener("document:keydown.escape", ["$event"])
  onEsc(ev: KeyboardEvent) {
    ev.stopPropagation();
    this.closeMenus();
    this.accountMenuOpen = false;
  }

  @HostListener("window:resize")
  onResize() {
    this.closeMenus();
  }

  // ================== TRACK BY ==================

  trackByIdx(index: number, m: any) {
    return (
      m?._id ||
      m?.id ||
      `${m.role || "msg"}:${(m.content || "").slice(0, 16)}:${index}`
    );
  }
}
