import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { environment } from "../../environments/environment";

@Injectable({ providedIn: "root" })
export class ChatService {
  constructor(private http: HttpClient) {}
  listThreads(){ return this.http.get<{ok:boolean, rows:any[]}>(environment.API_BASE + environment.PATHS.threads_list); }
  lastActive(){ return this.http.get<{ok:boolean, row:any}>(environment.API_BASE + environment.PATHS.threads_last); }
  getThread(id:string){ return this.http.get<{ok:boolean, row:any, messages:any[]}>(environment.API_BASE + environment.PATHS.thread_by_id(id)); }
  createThread(title?:string){ return this.http.post<{ok:boolean, row:any}>(environment.API_BASE + environment.PATHS.threads_list, { title: title||"Nuevo chat" }); }
  renameThread(id:string, title:string){ return this.http.put<{ok:boolean}>(environment.API_BASE + environment.PATHS.thread_by_id(id), { title }); }
  deleteThread(id:string){ return this.http.delete<{ok:boolean}>(environment.API_BASE + environment.PATHS.thread_by_id(id)); }
  sendMessage(threadId:string|null, content:string){
    return this.http.post<{ok:boolean, thread:any, messages:any[]}>(environment.API_BASE + environment.PATHS.messages, { threadId, content });
  }
}
