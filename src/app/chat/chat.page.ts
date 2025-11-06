import { Component, OnInit, ViewChild, ElementRef } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ChatService } from "./chat.service";
import { Router } from '@angular/router';
@Component({
  standalone: true,
  selector: "app-chat",
  templateUrl: "./chat.page.html",
  styleUrls: ["./chat.page.scss"],
  imports: [CommonModule, FormsModule]
})
export class ChatPage implements OnInit {
  threads:any[]=[]; current:any=null; messages:any[]=[];
  input=""; sending=false;
  @ViewChild("bottom") bottom!: ElementRef<HTMLDivElement>;

  constructor(private api: ChatService, private router: Router) {}

  ngOnInit(){ this.bootstrap(); }

  bootstrap(){
    console.log("[ChatPage] bootstrap");
    this.api.listThreads().subscribe({
      next: res => {
        console.log("[ChatPage] threads", res);
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
        console.log("[ChatPage] lastActive", res);
        this.current = res.row;
        if (this.current) this.loadMessages(this.current._id || this.current.id);
      },
      error: err => console.error("[ChatPage] lastActive error", err)
    });
  }

  loadMessages(id:string){
    console.log("[ChatPage] loadMessages", id);
    this.api.getThread(id).subscribe({
      next: res => {
        console.log("[ChatPage] getThread", res);
        this.current = res.row;
        this.messages = res.messages || [];
        setTimeout(()=>this.bottom?.nativeElement?.scrollIntoView({behavior:"smooth"}), 50);
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
        console.log("[ChatPage] newThread", res);
        this.threads.unshift(res.row);
        this.select(res.row);
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
        t.title = title;
        console.log("[ChatPage] renamed", id, title);
      },
      error: err => console.error("[ChatPage] rename error", err)
    });
  }

  removeThread(t:any){
    const id = t._id || t.id;
    if (!confirm("¿Eliminar este chat?")) return;
    this.api.deleteThread(id).subscribe({
      next: _ => {
        console.log("[ChatPage] deleted", id);
        this.threads = this.threads.filter(x => (x._id||x.id) !== id);
        this.current = null; this.messages = [];
        this.ensureActive();
      },
      error: err => console.error("[ChatPage] delete error", err)
    });
  }

  send(){
    const text = this.input.trim();
    if (!text || this.sending) return;
    this.sending = true;
    const id = this.current?._id || this.current?.id || null;
    console.log("[ChatPage] send", { id, text });

    // UI optimista
    const prev = this.messages.slice();
    this.messages = [...prev, { role: "user", content: text }, { role: "assistant", content: "…" }];
    setTimeout(()=>this.bottom?.nativeElement?.scrollIntoView({behavior:"smooth"}), 10);

    this.api.sendMessage(id, text).subscribe({
      next: res => {
        console.log("[ChatPage] sendMessage response", res);
        this.current = res.thread || this.current;
        this.messages = res.messages || this.messages;
        this.input = ""; this.sending = false;
        setTimeout(()=>this.bottom?.nativeElement?.scrollIntoView({behavior:"smooth"}), 10);
        this.bootstrap();
      },
      error: err => {
        console.error("[ChatPage] send error", err);
        // revertir placeholder
        this.messages = prev;
        this.sending=false;
      }
    });
  }

  logout() {
    try { localStorage.removeItem('token'); } catch {}
    this.router.navigateByUrl('/auth');
  }

  trackByIdx(_:number, m:any){ return m?.id || `${m.role}:${m.content?.slice(0,12)}`; }
}
