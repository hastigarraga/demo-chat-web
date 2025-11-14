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

// Pipes locales
import { LocalTzDatePipe } from "../shared/pipes/local-tz-date.pipe";
import { ThreadTitlePipe } from "../shared/pipes/thread-title.pipe";

import { environment } from "../../environments/environment";

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

  sidebarCollapsed = false;

  userName = "";
  userEmail = "";

  @ViewChild("bottom") bottom!: ElementRef<HTMLDivElement>;

  // menú contextual de hilos
  menuOpenId: string | null = null;
  menuTop = 0;
  menuLeft = 0;
  menuThreadRef: any = null;

  // menú de cuenta (donde está logout y conectar Google)
  accountMenuOpen = false;

  private _autoRenamed = new Set<string>();

  constructor(
    private chat: ChatService,
    private auth: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadUser();
    this.loadThreads();
  }

  private loadUser() {
    this.auth.me().subscribe({
      next: (res: any) => {
        const u = res?.user || {};
        this.userName = (u.name || "").trim();
        this.userEmail = (u.email || "").trim();
      },
      error: () => {
        // sin drama, solo no mostramos nombre/email
      },
    });
  }

  private loadThreads() {
    this.chat.listThreads().subscribe({
      next: (r: any) => {
        this.threads = r?.rows || [];
        if (this.threads.length) {
          this.openThread(this.threads[0]);
        }
      },
      error: (err) => console.error("[ChatPage] listThreads error", err),
    });

    // si hay “último activo”, lo abrimos
    this.chat.lastActive().subscribe({
      next: (r: any) => {
        const row = r?.row;
        if (!row) return;
        const id = row._id || row.id;
        const existing = this.threads.find(
          (t) => (t._id || t.id) === id
        );
        if (!existing) {
          this.threads = [row, ...this.threads];
        }
        this.openThread(row);
      },
      error: () => {
        // no es crítico
      },
    });
  }

  newThread() {
    this.chat.createThread().subscribe({
      next: (r: any) => {
        const t = r?.row;
        if (!t) return;
        this.threads = [t, ...this.threads];
        this.openThread(t, true);
      },
      error: (err) => console.error("[ChatPage] createThread error", err),
    });
  }

  openThread(t: any, resetMessages = false) {
    if (!t) return;
    const id = t._id || t.id;
    this.current = t;
    if (resetMessages) this.messages = [];

    this.chat.getThread(id).subscribe({
      next: (r: any) => {
        this.current = r?.row || this.current;
        this.messages = r?.messages || [];
        this.scrollBottom();
      },
      error: (err) => console.error("[ChatPage] getThread error", err),
    });
  }

  send() {
    const content = this.input.trim();
    if (!content || this.sending) return;

    const threadId = this.current?._id || this.current?.id || null;
    this.sending = true;

    this.chat.sendMessage(threadId, content).subscribe({
      next: (r: any) => {
        this.current = r?.thread || this.current;
        this.messages = r?.messages || [];

        const id = this.current?._id || this.current?.id;
        if (id) {
          const idx = this.threads.findIndex(
            (t) => (t._id || t.id) === id
          );
          if (idx === -1) {
            this.threads = [this.current, ...this.threads];
          } else {
            this.threads = this.threads.map((t, i) =>
              i === idx ? this.current : t
            );
          }
        }

        this.input = "";
        this.sending = false;
        this.scrollBottom();
        this.smartRenameIfNeeded();
      },
      error: (err) => {
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
        /* ignore */
      }
    }, 0);
  }

  toggleSidebar() {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  // ===== acciones sobre hilos (context menu) =====

  openMenu(ev: MouseEvent, thread: any) {
    ev.stopPropagation();
    const id = thread?._id || thread?.id;
    if (!id) return;

    this.menuOpenId = id;
    this.menuThreadRef = thread;

    this.menuTop = ev.clientY + 8;
    this.menuLeft = ev.clientX + 8;
  }

  closeMenus() {
    this.menuOpenId = null;
    this.menuThreadRef = null;
    this.accountMenuOpen = false;
  }

  renameThread(thread: any) {
    const id = thread?._id || thread?.id;
    if (!id) return;

    const currentTitle = String(thread.title || "").trim() || "New chat";
    const input = window.prompt("Edit title", currentTitle);
    if (!input) return;

    const title = input.trim();
    if (!title || title === currentTitle) return;

    this.chat.renameThread(id, title).subscribe({
      next: () => {
        this.threads = this.threads.map((t) =>
          (t._id || t.id) === id ? { ...t, title } : t
        );
        if (this.current && (this.current._id || this.current.id) === id) {
          this.current = { ...this.current, title };
        }
      },
      error: (err) => console.error("[ChatPage] renameThread error", err),
    });
  }

  removeThread(thread: any) {
    const id = thread?._id || thread?.id;
    if (!id) return;

    if (!window.confirm("Delete this chat?")) return;

    this.chat.deleteThread(id).subscribe({
      next: () => {
        this.threads = this.threads.filter(
          (t) => (t._id || t.id) !== id
        );
        if (this.current && (this.current._id || this.current.id) === id) {
          this.current = null;
          this.messages = [];
        }
      },
      error: (err) => console.error("[ChatPage] deleteThread error", err),
    });
  }

  // ===== renombrado inteligente =====

  private smartRenameIfNeeded() {
    const cur = this.current;
    if (!cur) return;

    const id = cur._id || cur.id;
    if (!id || this._autoRenamed.has(id)) return;

    const rawTitle = (cur.title || "").trim();
    if (rawTitle && rawTitle !== "Nuevo chat" && rawTitle !== "New chat") {
      return;
    }

    const sample = this.messages
      .filter((m) => m.role === "user")
      .map((m) => m.content || "")
      .join(" ")
      .slice(0, 200);

    if (!sample) return;

    this._autoRenamed.add(id);

    this.chat.generateSmartTitle(sample).subscribe({
      next: (t: string) => {
        const title = (t || "").trim();
        if (!title) return;

        this.chat.renameThread(id, title).subscribe({
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
          error: (err) =>
            console.error("[ChatPage] auto rename persist error", err),
        });
      },
      error: (err) => {
        console.error("[ChatPage] generateSmartTitle error", err);
        this._autoRenamed.delete(id);
      },
    });
  }

  // ===== menú de cuenta / Google Workspace =====

  toggleAccountMenu(ev: MouseEvent) {
    ev.stopPropagation();
    this.accountMenuOpen = !this.accountMenuOpen;
    if (this.accountMenuOpen) {
      this.menuOpenId = null;
      this.menuThreadRef = null;
    }
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

  // ===== listeners globales =====

  @HostListener("document:click")
  onDocClick() {
    this.closeMenus();
  }

  @HostListener("document:keydown.escape", ["$event"])
  onEsc(ev: KeyboardEvent) {
    ev.stopPropagation();
    this.closeMenus();
  }

  @HostListener("window:resize")
  onResize() {
    this.closeMenus();
  }

  trackByThread(_: number, t: any) {
    return t?._id || t?.id;
  }

  trackByMessage(_: number, m: any) {
    return m?._id || m?.id || `${m.role}:${(m.content || "").slice(0, 16)}`;
  }
}
