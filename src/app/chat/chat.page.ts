import { Component, OnInit, ViewChild, ElementRef } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ChatService } from "./chat.service";

@Component({
  standalone: true,
  selector: "app-chat",
  templateUrl: "./chat.page.html",
  styleUrls: ["./chat.page.scss"],
  imports: [CommonModule, FormsModule]
})
export class ChatPage implements OnInit {
  threads:any[]=[]; current:any=null; input=""; sending=false;
  @ViewChild("bottom") bottom!: ElementRef<HTMLDivElement>;
  constructor(private api: ChatService) {}
  ngOnInit(){ this.api.lastActive().subscribe({next:t=>{this.current=t;this.load();},error:_=>this.load()}); }
  load(){ this.api.listThreads().subscribe(list=>{ this.threads=list||[]; if(!this.current&&this.threads.length) this.current=this.threads[0]; }); }
  select(t:any){ if(this.current?.id===t?.id) return; this.current=t; }
  send(){
    const text=this.input.trim(); if(!text||this.sending) return;
    this.sending=true;
    this.api.sendMessage(this.current?.id||null, text).subscribe({
      next: res => { this.current=res?.thread??this.current; this.input=""; this.sending=false;
        setTimeout(()=>this.bottom?.nativeElement?.scrollIntoView({behavior:"smooth"}),50);
        this.load(); },
      error: _ => { this.sending=false; }
    });
  }
  trackById(_:number,t:any){ return t?.id||t?._id||t?.threadId; }
}
